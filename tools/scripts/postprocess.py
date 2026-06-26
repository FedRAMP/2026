from pathlib import Path
import sys


def _add_pipx_site_packages(package_name: str) -> None:
    pipx_venv = Path.home() / ".local" / "pipx" / "venvs" / package_name
    for site_packages in pipx_venv.glob("lib/python*/site-packages"):
        if site_packages.is_dir():
            sys.path.append(str(site_packages))


try:
    from plugin import postprocess_site
except ModuleNotFoundError:
    _add_pipx_site_packages("mkdocs-ultralytics-plugin")
    from plugin import postprocess_site

if __name__ == "__main__":
    postprocess_site(
        site_dir="../html",  # Your build output directory
        docs_dir="../src",  # Your source docs directory
        site_url="https://fedramp.gov/2026",
        default_image="https://preview.fedramp.gov/2026/assets/thumbnail.png",
        default_author="pete@fedramp.gov",
        add_desc=True,
        add_image=True,
        add_keywords=True,
        add_authors=False,
        add_json_ld=True,
        add_share_buttons=False,
        add_css=False,
        add_copy_llm=True,
        verbose=True,
    )
