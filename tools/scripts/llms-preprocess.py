"""Select the Markdown export body without changing the HTML page."""
from pathlib import Path

CONTENT = Path(__file__).resolve().parents[2] / "content"
AGENTS = "https://www.fedramp.gov/2026/sources/#agents"


def preprocess(html, output):
    # Zensical exports both guide.md and guide/index.md as guide/index.md.
    directory = Path(output).parent
    if (CONTENT / output).is_file() or (
        directory != Path(".") and (CONTENT / f"{directory}.md").is_file()
    ):
        return html
    return f'<p><a href="{AGENTS}">Access the machine-readable FedRAMP rules and instructions for agents.</a></p>'
