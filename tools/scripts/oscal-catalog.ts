import { XMLParser, XMLValidator } from "fast-xml-parser";

type XmlNode = Record<string, unknown>;

export interface OscalCatalogMetadata {
  title: string;
  version: string;
  oscalVersion: string;
  lastModified: string;
}

export interface OscalParameter {
  id: string;
  label: string;
  selection: boolean;
}

export interface OscalControl {
  id: string;
  officialId: string;
  sortId: string;
  title: string;
  statementLines: string[];
  parameters: ReadonlyMap<string, OscalParameter>;
}

export interface OscalControlFamily {
  id: string;
  title: string;
  controls: ReadonlyMap<string, OscalControl>;
}

export interface OscalCatalog {
  metadata: OscalCatalogMetadata;
  families: ReadonlyMap<string, OscalControlFamily>;
  controls: ReadonlyMap<string, OscalControl>;
  parameters: ReadonlyMap<string, OscalParameter>;
}

function elementName(node: XmlNode): string | undefined {
  return Object.keys(node).find((key) => key !== "#text" && key !== ":@");
}

function elementChildren(node: XmlNode): XmlNode[] {
  const name = elementName(node);
  if (!name) {
    return [];
  }

  const children = node[name];
  return Array.isArray(children) ? (children as XmlNode[]) : [];
}

function attribute(node: XmlNode, name: string): string | undefined {
  const attributes = node[":@"];
  if (!attributes || typeof attributes !== "object") {
    return undefined;
  }

  const value = (attributes as Record<string, unknown>)[`@_${name}`];
  return typeof value === "string" ? value : undefined;
}

function directElements(nodes: XmlNode[], name: string): XmlNode[] {
  return nodes.filter((node) => elementName(node) === name);
}

function firstDirectElement(
  nodes: XmlNode[],
  name: string,
): XmlNode | undefined {
  return nodes.find((node) => elementName(node) === name);
}

function normalizeText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function plainText(nodes: XmlNode[]): string {
  const parts: string[] = [];

  for (const node of nodes) {
    const text = node["#text"];
    if (typeof text === "string") {
      parts.push(text);
      continue;
    }

    parts.push(plainText(elementChildren(node)));
  }

  return normalizeText(parts.join(""));
}

function directElementText(nodes: XmlNode[], name: string): string {
  const node = firstDirectElement(nodes, name);
  return node ? plainText(elementChildren(node)) : "";
}

function walkElements(
  nodes: XmlNode[],
  visitor: (node: XmlNode, name: string) => void,
): void {
  for (const node of nodes) {
    const name = elementName(node);
    if (!name) {
      continue;
    }

    visitor(node, name);
    walkElements(elementChildren(node), visitor);
  }
}

function directPropValue(
  nodes: XmlNode[],
  name: string,
  className?: string,
): string | undefined {
  for (const prop of directElements(nodes, "prop")) {
    if (attribute(prop, "name") !== name) {
      continue;
    }

    if (className && attribute(prop, "class") !== className) {
      continue;
    }

    const value = attribute(prop, "value");
    if (value) {
      return value;
    }
  }

  return undefined;
}

export function normalizeOscalControlId(value: string): string {
  return value
    .trim()
    .replace(/\((\d+)\)/g, "-$1")
    .replace(/\s+/g, "")
    .replaceAll(".", "-")
    .toUpperCase();
}

function parameterAssignment(
  parameterId: string,
  parameters: ReadonlyMap<string, OscalParameter>,
): string {
  const parameter = parameters.get(parameterId);
  if (!parameter) {
    return `[Assignment: ${parameterId}]`;
  }

  if (parameter.selection) {
    return `[Selection: ${parameter.label}]`;
  }

  const label = parameter.label.replace(/^organization-defined\s+/i, "");
  return `[Assignment: organization-defined ${label}]`;
}

function inlineMarkdown(
  nodes: XmlNode[],
  parameters: ReadonlyMap<string, OscalParameter>,
): string {
  const parts: string[] = [];

  for (const node of nodes) {
    const text = node["#text"];
    if (typeof text === "string") {
      parts.push(text);
      continue;
    }

    const name = elementName(node);
    if (!name) {
      continue;
    }

    if (name === "insert" && attribute(node, "type") === "param") {
      const parameterId = attribute(node, "id-ref");
      parts.push(
        parameterId
          ? parameterAssignment(parameterId, parameters)
          : "[Assignment]",
      );
      continue;
    }

    const contents = inlineMarkdown(elementChildren(node), parameters);
    if (name === "em") {
      parts.push(`*${contents}*`);
    } else if (name === "strong") {
      parts.push(`**${contents}**`);
    } else if (name === "code") {
      parts.push(`\`${contents}\``);
    } else if (name === "q") {
      parts.push(`“${contents}”`);
    } else if (name === "a") {
      const href = attribute(node, "href");
      parts.push(href && !href.startsWith("#") ? `[${contents}](${href})` : contents);
    } else {
      parts.push(contents);
    }
  }

  return normalizeText(parts.join(""));
}

function partLabel(nodes: XmlNode[]): string | undefined {
  return directPropValue(nodes, "label");
}

function renderItemPart(
  part: XmlNode,
  depth: number,
  parameters: ReadonlyMap<string, OscalParameter>,
): string[] {
  const children = elementChildren(part);
  const paragraphs = directElements(children, "p")
    .map((paragraph) => inlineMarkdown(elementChildren(paragraph), parameters))
    .filter(Boolean);
  const nestedParts = directElements(children, "part");
  const indent = "    ".repeat(depth);
  const label = partLabel(children);
  const labelPrefix = label ? `**${label}** ` : "";
  const lines: string[] = [];

  if (paragraphs.length) {
    lines.push(`${indent}- ${labelPrefix}${paragraphs[0]}`);
    for (const paragraph of paragraphs.slice(1)) {
      lines.push(`${indent}  ${paragraph}`);
    }
  } else {
    lines.push(`${indent}- ${labelPrefix}`.trimEnd());
  }

  for (const nestedPart of nestedParts) {
    lines.push(...renderItemPart(nestedPart, depth + 1, parameters));
  }

  return lines;
}

function renderStatement(
  controlChildren: XmlNode[],
  parameters: ReadonlyMap<string, OscalParameter>,
): string[] {
  const statement = directElements(controlChildren, "part").find(
    (part) => attribute(part, "name") === "statement",
  );
  if (!statement) {
    return [];
  }

  const statementChildren = elementChildren(statement);
  const lines: string[] = [];
  const paragraphs = directElements(statementChildren, "p")
    .map((paragraph) => inlineMarkdown(elementChildren(paragraph), parameters))
    .filter(Boolean);

  paragraphs.forEach((paragraph, index) => {
    if (index > 0) {
      lines.push("");
    }
    lines.push(paragraph);
  });

  const itemParts = directElements(statementChildren, "part");
  if (paragraphs.length && itemParts.length) {
    lines.push("");
  }

  itemParts.forEach((part, index) => {
    if (index > 0 && attribute(part, "name") !== "item") {
      lines.push("");
    }
    lines.push(...renderItemPart(part, 0, parameters));
  });

  return lines;
}

function parseParameters(catalogChildren: XmlNode[]): Map<string, OscalParameter> {
  const parameters = new Map<string, OscalParameter>();

  walkElements(catalogChildren, (node, name) => {
    if (name !== "param") {
      return;
    }

    const id = attribute(node, "id");
    const children = elementChildren(node);
    const explicitLabel = directElementText(children, "label");
    const select = firstDirectElement(children, "select");
    const choices = select
      ? directElements(elementChildren(select), "choice")
          .map((choice) => plainText(elementChildren(choice)))
          .filter(Boolean)
      : [];
    const selectionLabel = choices.length
      ? `${attribute(select!, "how-many") === "one-or-more" ? "one or more of" : "one of"}: ${choices.join("; ")}`
      : "";
    const label = explicitLabel || selectionLabel;
    if (!id || !label) {
      return;
    }

    parameters.set(id, { id, label, selection: choices.length > 0 });
  });

  return parameters;
}

function parseControl(
  node: XmlNode,
  allParameters: ReadonlyMap<string, OscalParameter>,
): OscalControl {
  const children = elementChildren(node);
  const officialId =
    directPropValue(children, "label", "zero-padded") ??
    directPropValue(children, "label") ??
    "";
  const sortId =
    directPropValue(children, "sort-id") ?? attribute(node, "id") ?? "";
  const id = normalizeOscalControlId(officialId || sortId);
  const title = directElementText(children, "title");
  const parameters = new Map<string, OscalParameter>();

  for (const parameterNode of directElements(children, "param")) {
    const parameterId = attribute(parameterNode, "id");
    if (!parameterId) {
      continue;
    }

    const parameter = allParameters.get(parameterId);
    if (parameter) {
      parameters.set(parameterId, parameter);
    }
  }

  if (!id || !officialId || !title) {
    throw new Error(
      `OSCAL control is missing its canonical identifier or title: ${attribute(node, "id") ?? "unknown control"}`,
    );
  }

  return {
    id,
    officialId,
    sortId,
    title,
    statementLines: renderStatement(children, allParameters),
    parameters,
  };
}

function requiredMetadataText(nodes: XmlNode[], name: string): string {
  const value = directElementText(nodes, name);
  if (!value) {
    throw new Error(`OSCAL catalog metadata is missing ${name}.`);
  }

  return value;
}

export function parseOscalCatalog(xml: string): OscalCatalog {
  const validation = XMLValidator.validate(xml);
  if (validation !== true) {
    throw new Error(
      `Invalid OSCAL XML: ${validation.err.msg} at line ${validation.err.line}, column ${validation.err.col}.`,
    );
  }

  const parsed = new XMLParser({
    attributeNamePrefix: "@_",
    ignoreAttributes: false,
    preserveOrder: true,
    trimValues: false,
  }).parse(xml) as XmlNode[];
  const catalogNode = parsed.find((node) => elementName(node) === "catalog");
  if (!catalogNode) {
    throw new Error("OSCAL document does not contain a catalog root element.");
  }

  const catalogChildren = elementChildren(catalogNode);
  const metadataNode = firstDirectElement(catalogChildren, "metadata");
  if (!metadataNode) {
    throw new Error("OSCAL catalog does not contain metadata.");
  }

  const metadataChildren = elementChildren(metadataNode);
  const metadata: OscalCatalogMetadata = {
    title: requiredMetadataText(metadataChildren, "title"),
    version: requiredMetadataText(metadataChildren, "version"),
    oscalVersion: requiredMetadataText(metadataChildren, "oscal-version"),
    lastModified: requiredMetadataText(metadataChildren, "last-modified"),
  };
  const parameters = parseParameters(catalogChildren);
  const controls = new Map<string, OscalControl>();
  const families = new Map<string, OscalControlFamily>();

  for (const groupNode of directElements(catalogChildren, "group")) {
    const groupChildren = elementChildren(groupNode);
    const id = (
      directPropValue(groupChildren, "label") ??
      attribute(groupNode, "id") ??
      ""
    ).toUpperCase();
    const title = directElementText(groupChildren, "title");
    if (!id || !title) {
      throw new Error("OSCAL control family is missing its identifier or title.");
    }

    const familyControls = new Map<string, OscalControl>();
    const addControl = (controlNode: XmlNode): void => {
      const control = parseControl(controlNode, parameters);
      if (controls.has(control.id)) {
        throw new Error(`Duplicate OSCAL control identifier: ${control.id}`);
      }

      controls.set(control.id, control);
      familyControls.set(control.id, control);

      for (const enhancementNode of directElements(
        elementChildren(controlNode),
        "control",
      )) {
        addControl(enhancementNode);
      }
    };

    for (const controlNode of directElements(groupChildren, "control")) {
      addControl(controlNode);
    }

    families.set(id, {
      id,
      title,
      controls: familyControls,
    });
  }

  return {
    metadata,
    families,
    controls,
    parameters,
  };
}
