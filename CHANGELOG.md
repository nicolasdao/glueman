# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="0.1.0-alpha.3"></a>
# [0.1.0-alpha.3](https://github.com/nicolasdao/glueman/compare/v0.1.0-alpha.2...v0.1.0-alpha.3) (2017-10-11)


### Features

* Add support for automatically re-gluing when new files/folders are added, renamed or deleted (thanks to chokidar) ([5bd6118](https://github.com/nicolasdao/glueman/commit/5bd6118))



<a name="0.1.0-alpha.2"></a>
# [0.1.0-alpha.2](https://github.com/nicolasdao/glueman/compare/v0.1.0-alpha.1...v0.1.0-alpha.2) (2017-10-10)


### Bug Fixes

* Finish refactoring of the getAST method to improve performances ([5a18710](https://github.com/nicolasdao/glueman/commit/5a18710))



<a name="0.1.0-alpha.1"></a>
# [0.1.0-alpha.1](https://github.com/nicolasdao/glueman/compare/v0.1.0-alpha.0...v0.1.0-alpha.1) (2017-10-08)



<a name="0.1.0-alpha.0"></a>
# 0.1.0-alpha.0 (2017-10-08)


### Bug Fixes

* Improve performance ([388a96c](https://github.com/nicolasdao/glueman/commit/388a96c))
* Improve performances by preventing big file processing is they do not contain any template references ([a0e9fc5](https://github.com/nicolasdao/glueman/commit/a0e9fc5))
* Remove all blocking synchronous code and replace it with asynchronous promises ([3f29ec2](https://github.com/nicolasdao/glueman/commit/3f29ec2))
* Remove logging ([0d17778](https://github.com/nicolasdao/glueman/commit/0d17778))


### Features

* Add an ignore.json file that contains a list of all files that should never be glued. ([6e39b98](https://github.com/nicolasdao/glueman/commit/6e39b98))
* Add hot reload feature ([cc96492](https://github.com/nicolasdao/glueman/commit/cc96492))
* Add messaging to confirm glueman is hot-reloading files ([8feac7b](https://github.com/nicolasdao/glueman/commit/8feac7b))
* Add support for indentation when reassembling all the files ([a82ab73](https://github.com/nicolasdao/glueman/commit/a82ab73))
* add support for passing HTML content from the template invocation to the template ([64e0c34](https://github.com/nicolasdao/glueman/commit/64e0c34))
* Add support for passing parameters in the glue template, as well as injecting them in the template ([51bf908](https://github.com/nicolasdao/glueman/commit/51bf908))
* Add support for RegEx in the getAST ([d114c5f](https://github.com/nicolasdao/glueman/commit/d114c5f))
* Create glueman ([568d382](https://github.com/nicolasdao/glueman/commit/568d382))
* Refactor glue index.js to support new form of syntax using <glue src='...'> instead of [<][>] delimiters ([5126e4a](https://github.com/nicolasdao/glueman/commit/5126e4a))
