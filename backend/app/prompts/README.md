# prompts

Prompt text lives here, never inline in Python.

- One file per prompt: `templates/<name>.txt`. Name it `<feature>_<role>` (e.g.
  `ideas_summarize_system`).
- `render_prompt(name, **values)` replaces `{key}` placeholders (lowercase
  identifiers). Missing or unused values raise `PromptError`. JSON examples in a
  prompt are safe because `{"...` is not a placeholder.
- List the prompt names an LLM feature uses in its integration seed
  (`backend/app/llm/integrations/<key>.yaml`, `prompts:`).
- Prompt edits change product behavior: rerun the feature's smoke or proof call
  and note the change in the PR.
