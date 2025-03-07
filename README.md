<p align="center">
  <a href="https://github.com/geldata/setup-gel/actions"><img alt="setup-gel build status" src="https://github.com/geldata/setup-gel/workflows/build-test/badge.svg"></a>
</p>

# setup-gel v1

This action downloads and installs Gel CLI and/or Gel Server and makes both
available in `PATH`.

# Usage

See [action.yml](action.yml) for the action's specification.

How this action works:

This action executes different commands depending on state of files in
repository and inputs for action in workflow. It can:

1. Install Gel tools (CLI and/or server)
2. Create new Gel instance
3. Initialize new
   [Gel project](https://docs.geldata.com/reference/cli/gel_project) or link an
   existing one to remote instance

The following examples show how to use this action.

Example (installs stable Gel CLI with server and makes them available in
`$PATH`) Note: if your repository has `gel.toml` file, then this action will
also initialize new project for your workflow. Otherwise, it will just install
Gel CLI and executable server that you can use on your own.

```yaml
on: push

jobs:
  test:
    runs-on: ubuntu-latest
    name: CI with Gel action
    steps:
      - uses: actions/checkout@v2
      - uses: geldata/setup-gel@v1
      - run: gel --version
```

Example (installs latest Gel CLI without server and makes CLI available in
`$PATH`)

```yaml
on: push

jobs:
  test:
    runs-on: ubuntu-latest
    name: CI with Gel action
    steps:
      - uses: actions/checkout@v2
      - uses: geldata/setup-gel@v1
        with:
          cli-version: nightly
          server-version: none
      - run: gel --version
```

Example (installs Gel CLI with server, creates new Gel instance and links it
using `gel project init`) NOTE: this assumes that repository for the project has
already been initialized using `gel project init` and `gel.toml` file exists in
the repository.

```yaml
on: push

jobs:
  test:
    runs-on: ubuntu-latest
    name: CI with Gel action
    steps:
      - uses: actions/checkout@v4
      - uses: geldata/setup-gel@v1
      - run: gel query "SELECT 'Hello from GitHub Actions'"
```

Example (same as one above, but using `services` from GitHub Actions and
`gel project init --link`)

```yaml
on: push

jobs:
  test:
    runs-on: ubuntu-latest
    name: CI with Gel action
    services:
      gel:
        image: geldata/gel:6
        env:
          EDGEDB_SERVER_SECURITY: insecure_dev_mode
        ports:
          - 5656:5656
    steps:
      - uses: actions/checkout@v4
      - uses: geldata/setup-gel@v1
        with:
          server-dsn: gel://localhost:5656
          instance-name: ci_gel_instance # optional
      - run: gel query "SELECT 'Hello from GitHub Actions'"
```

Example (creates new instance, but overrides `server-version` from `gel.toml` if
project initialization is to be used)

```yaml
on: push

jobs:
  test:
    runs-on: ubuntu-latest
    name: CI with Gel action
    steps:
      - uses: actions/checkout@v4
      - uses: geldata/setup-gel@v1
        with:
          server-version: 6.0
          instance-name: ci_gel_instance
      - run: gel query "SELECT 'Hello from GitHub Actions'"
```
