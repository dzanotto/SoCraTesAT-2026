# TDD inside the agent loop: theater or actual value?
## Starting point
The article by Birgitta Böckeler is here: https://martinfowler.com/articles/exploring-gen-ai/tdd-in-the-agent-loop.html

## Our experience
Forcing agents to do TDD requires a lot of effort, costs much more than not doing it (in terms of tokens) and apparently results aren't better.

A framework that manages to do TDD properly (with a token cost...): https://github.com/nWave-ai/nWave

## What to do instead?
### Practices to explore with agents:
* Acceptance tests
* Mutation testing
* OKF https://cloud.google.com/blog/products/data-analytic/how-the-open-knowledge-format-can-improve-data-sharing/
* Compound Engineering
* Continuous refactoring
* Human review
* Commit prompts with changes
* Habit hooks https://github.com/habit-hooks/habit-hooks
