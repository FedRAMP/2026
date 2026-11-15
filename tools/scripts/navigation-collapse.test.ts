import { expect, test } from "bun:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolveToolPath } from "./config";

const exec = promisify(execFile);

test("configured navigation sections retain toggles and children, opening only when active", async () => {
  const { stdout } = await exec(resolveToolPath(".venv/bin/python"), [
    "-c",
    `
from pathlib import Path
from types import SimpleNamespace as Node
from jinja2 import Environment
import sys

env = Environment()
env.filters['url'] = lambda value: value
source = Path(sys.argv[1]).read_text()
def render(url='reference/controls/', active=False, level=2, expand=False):
    index = Node(title='Control reference', url=url, is_index=True, active=False, meta={})
    child = Node(title='Family', url=url+'family/', is_index=False, active=False, meta={})
    item = Node(title='Renamed reference', children=[index, child], active=active)
    features = ['navigation.tabs', 'navigation.sections', 'navigation.indexes', 'navigation.prune']
    if expand: features.append('navigation.expand')
    module = env.from_string(source).make_module(dict(features=features, page=None, config={'extra': {'collapsible_navigation_indexes': ['reference/controls/']}, 'theme': {'variant': 'modern'}}))
    return module.render(item, '__nav_test', level, Node(active=True))

inactive = render(expand=True)
assert 'md-nav__item--section' not in inactive
assert 'md-nav__item--pruned' not in inactive
assert 'md-toggle--indeterminate' not in inactive
assert 'type="checkbox"' in inactive and ' checked' not in inactive
assert 'reference/controls/family/' in inactive
assert 'tabindex="0"' in inactive
active = render(active=True)
assert ' checked' in active and 'reference/controls/family/' in active
ordinary = render(url='reference/other/')
assert 'md-nav__item--section' in ordinary
assert 'reference/other/family/' in ordinary
pruned = render(url='reference/other/', level=3)
assert 'md-nav__item--pruned' in pruned
assert 'reference/other/family/' not in pruned
# Expansion propagates through descendants, without opening the class itself.
index = Node(title='Class', url='providers/20x/a/', is_index=True, active=False, meta={})
leaf = Node(title='Rule', url='providers/20x/a/rule/', is_index=False, active=False, meta={})
inner = Node(title='Inner group', children=[leaf], active=False)
group = Node(title='Boundary', children=[inner], active=False)
item = Node(title='Class A', children=[index, group], active=False)
module = env.from_string(source).make_module(dict(features=['navigation.tabs', 'navigation.sections', 'navigation.indexes', 'navigation.prune'], page=None, config={'extra': {'expanded_navigation_children': ['providers/20x/a/']}, 'theme': {'variant': 'modern'}}))
from html.parser import HTMLParser
class Toggles(HTMLParser):
    def __init__(self): super().__init__(); self.checked = []
    def handle_starttag(self, tag, attrs):
        if tag == 'input': self.checked.append('checked' in dict(attrs))
parser = Toggles()
result = module.render(item, '__class', 3, Node(active=True))
parser.feed(result)
assert parser.checked == [False, True, True], parser.checked
assert 'providers/20x/a/rule/' in result
assert 'md-nav__item--pruned' not in result
print('ok')
`,
    resolveToolPath("../overrides/partials/nav-item.html"),
  ]);
  expect(stdout.trim()).toBe("ok");
});
