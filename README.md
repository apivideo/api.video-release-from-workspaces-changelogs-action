[![badge](https://img.shields.io/twitter/follow/api_video?style=social)](https://twitter.com/intent/follow?screen_name=api_video) &nbsp; [![badge](https://img.shields.io/github/stars/apivideo/api.video-release-from-workspaces-changelogs-action?style=social)](https://github.com/apivideo/api.video-release-from-workspaces-changelogs-action) &nbsp; [![badge](https://img.shields.io/discourse/topics?server=https%3A%2F%2Fcommunity.api.video)](https://community.api.video)
![](https://github.com/apivideo/.github/blob/main/assets/apivideo_banner.png)
<h1 align="center">release-from-workspaces-changelogs-action</h1>

[api.video](https://api.video) is the video infrastructure for product builders. Lightning fast video APIs for integrating, scaling, and managing on-demand & low latency live streaming features in your app.

# Table of contents

- [Table of contents](#table-of-contents)
- [Project description](#project-description)
- [Documentation](#documentation)
  - [Expected CHANGELOG file format](#expected-changelog-file-format)
  - [Inputs](#inputs)
      - [`github-auth-token`](#github-auth-token)
  - [Example usage](#example-usage)

# Project description

Automatically create draft releases depending on the CHANGELOG.md files of each npm workspace of the repo.

# Documentation

## Expected CHANGELOG file format
```markdown
## [0.1.0] - 2021-12-06
- Change 1
- Change 2
- ...
- Change n

## [0.0.1] - 2021-11-15
- Change 1
- ...

...
```

## Inputs

#### `github-auth-token`

**required** GitHub authentication token.

## Example usage

```yml
uses: apivideo/api.video-release-from-workspaces-changelogs-action
with:
  github-auth-token: ${{ secrets.GITHUB_TOKEN }}
```
