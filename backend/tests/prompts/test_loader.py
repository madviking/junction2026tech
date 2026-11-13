import pytest

from app.prompts import PromptError, render_prompt


def test_render_replaces_placeholders() -> None:
    text = render_prompt("example_summary_system", max_points=3)

    assert "at most 3 bullet points" in text
    assert "{" not in text


def test_render_rejects_missing_and_unused_values() -> None:
    with pytest.raises(PromptError, match="missing=\\['max_points'\\]"):
        render_prompt("example_summary_system")
    with pytest.raises(PromptError, match="unused=\\['typo'\\]"):
        render_prompt("example_summary_system", max_points=3, typo=1)


def test_missing_prompt_file_raises() -> None:
    with pytest.raises(PromptError, match="prompt_missing"):
        render_prompt("does_not_exist")
