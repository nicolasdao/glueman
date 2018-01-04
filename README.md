# Glueman &middot;  [![NPM](https://img.shields.io/npm/v/glueman.svg?style=flat)](https://www.npmjs.com/package/glueman) [![Tests](https://travis-ci.org/nicolasdao/glueman.svg?branch=master)](https://travis-ci.org/nicolasdao/glueman) [![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause) [![Neap](https://neap.co/img/made_by_neap.svg)](#this-is-what-we-re-up-to)
#### Breaking down files of any text format into components and then reassemble them.

## Install
```
npm install glueman --save
```

## Why Using Glueman
We mainly built Glueman to break down static websites into components without using anything else than plain HTML. No webpack or grunt or gulp configuration shenanigans. Just break down your static website into component using plain HTML, then reference them into your main HTML pages using their path and THAT'S IT!!! It looks something like this:

___This could be an HTML page that references one of your new component:___
```html
<p>A lot of HTML stuff here</p>
<div>
  <glue src="relativepath/components/yourcomponent.html" someparam="a_picture_for_example.png">
    <someothervar>
      <p>Hello, I'm a lot of other HTML<p/>
    </someothervar>
  </glue>
</div>
<p>Another heaps of other HTML stuff here</p>
```

___yourcomponent.html loacated under relativepath/components/___
```html
<div>
  <img src="./static/img/<glue.someparam/>">
  <div>
    <glue.someothervar/>
  </div>
</div>
```

## How To use It
To use Glueman, you must:
1. [Break down some source files into components](#breaking-down-your-source-files-to-be-reassembled), and then 
2. [Run a command to reassemble them](#commands).

#### Breaking Down Your Source Files To Be Reassembled
Let's just imagine the following source folder under the _**my_website**_ folder:
```
  my_website/
  |
  |__src/
      |
      |__img/
      |   |
      |   |__cat.jpg
      |
      |__components/
      |      |
      |      |__base.html
      |      |
      |      |__header.html
      |
      |__home.html
      |
      |__about.html
```

where the files _**base.html**_ and _**header.html**_ are components files written in plain HTML, and _**home.html**_ and _**about.html**_ are HTML files referencing the component files:

__*base.html*__
```html
<!DOCTYPE html>
<html>
<head>
  <title><glue.title/></title>
</head>
<body>
  <glue.body/>
</body>
</html>
```

> This will be our base template that all HTML files will be using. Notice the special tags _**<glue.title/>**_ and _**<glue.body/>**_. Glueman uses the reserved _**<glue>**_ tag to either:
> - Reference a parameter (e.g. <glue.someparam/>)
> - Reference another file (e.g. <glue src="./path/to/a/file.smth"/>)
In the above example, _<glue.title/>_ and _<glue.body/>_ means that the _base.html_ component expects 2 parameters called respectively _title_ and _body_. More about this below.

__*header.html*__
```html
<h1><glue.title/></h1>
<h2>CONTENT</h2>
<div>
  <img src="<glue.root/>/img/cat.jpg"/>
  <p>
    <glue.propwhatever/>
  </p>
</div>
```
> Very similar to the _base.html_ component above. Here we have 3 parameters that can be passed: _title_, _root_ and _propwhatever_.

__*home.html*__
```html
<glue src="./components/base.html" title="Welcome Home!">
  <body>
    <glue src="./components/header.html" root="." title="A Cat!?">
      <propwhatever>This is some <strong>serious gluing</strong> here.</propwhatever>
    </glue>
  </body>
</glue>
```
> The _home.html_ file uses both the _base.html_ and the _header.html_ components. Notice:
> - To reference a component, you need to use the _**src**_ attribute of the _**<glue>**_ tag.
> - There are 2 ways of passing parameters to a component. (a) using an attribute (e.g. title="Welcome Home!") (b) using a tag named like the parameter (e.g. <body> and <propwhatever>). The recommendation is to use attributes for short parameter value, and tags for big values like text or HTML content.

__*about.html*__
```html
<glue src="./components/base.html" title="About Us">
  <body>
    <glue src="./components/header.html" root="." title="About a Cat!?">
      <propwhatever>We're serious about cats!</propwhatever>
    </glue>
  </body>
</glue>
```
> Very similar to the above _home.html_.

#### Commands
Browse to the _**my_website**_ folder, and run one of the following command:
```
glue run ./src ./dst
```
This will copy the entire content of the ./src folder into the ./dst folder. The difference between ./src and ./dst is that all files under ./dst will have been reassembled.

To automatically reassemble all files under ./dst each time a change to a files is made inside ./src, you can run the following:
```
glue start ./src ./dst
```

In both cased, using the example above, you'll end up with this:
```
  my_website/
  |
  |__dst/
  |   |
  |   |__img/
  |   |   |
  |   |   |__cat.jpg
  |   |
  |   |__components/
  |   |      |
  |   |      |__base.html
  |   |      |
  |   |      |__header.html
  |   |
  |   |__home.html
  |   |
  |   |__about.html
  |
  |__src/
  ```

  > Notice the new _**dst**_ folder. It looks exactly like the _**src**_ folder, except that all the files have been reassembled:

  __*home.html*__
```html
<!DOCTYPE html>
<html>
<head>
  <title>Welcome Home!</title>
</head>
<body>
  
    <h1>A Cat!?</h1>
    <h2>CONTENT</h2>
    <div>
      <img src="./img/cat.jpg"/>
      <p>
        This is some <strong>serious gluing</strong> here.
      </p>
    </div>
    
  
</body>
</html>
```

__*about.html*__
```html
<!DOCTYPE html>
<html>
<head>
  <title>About Us</title>
</head>
<body>
  
    <h1>About a Cat!?</h1>
    <h2>CONTENT</h2>
    <div>
      <img src="./img/cat.jpg"/>
      <p>
        We're serious about cats!
      </p>
    </div>
    
  
</body>
</html>
```

# This Is What We re Up To
We are Neap, an Australian Technology consultancy powering the startup ecosystem in Sydney. We simply love building Tech and also meeting new people, so don't hesitate to connect with us at [https://neap.co](https://neap.co).

Our other open-sourced projects:
#### Web Framework & Deployment Tools
* [__*webfunc*__](https://github.com/nicolasdao/webfunc): Write code for serverless similar to Express once, deploy everywhere. 
* [__*now-flow*__](https://github.com/nicolasdao/now-flow): Automate your Zeit Now Deployments.

#### GraphQL
* [__*graphql-serverless*__](https://github.com/nicolasdao/graphql-serverless): GraphQL (incl. a GraphiQL interface) middleware for [webfunc](https://github.com/nicolasdao/webfunc).
* [__*schemaglue*__](https://github.com/nicolasdao/schemaglue): Naturally breaks down your monolithic graphql schema into bits and pieces and then glue them back together.
* [__*graphql-s2s*__](https://github.com/nicolasdao/graphql-s2s): Add GraphQL Schema support for type inheritance, generic typing, metadata decoration. Transpile the enriched GraphQL string schema into the standard string schema understood by graphql.js and the Apollo server client.

#### React & React Native
* [__*react-native-game-engine*__](https://github.com/bberak/react-native-game-engine): A lightweight game engine for react native.
* [__*react-native-game-engine-handbook*__](https://github.com/bberak/react-native-game-engine-handbook): A React Native app showcasing some examples using react-native-game-engine.

#### Tools
* [__*aws-cloudwatch-logger*__](https://github.com/nicolasdao/aws-cloudwatch-logger): Promise based logger for AWS CloudWatch LogStream.


# License
Copyright (c) 2018, Neap Pty Ltd.
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
* Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
* Neither the name of Neap Pty Ltd nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL NEAP PTY LTD BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

<p align="center"><a href="https://neap.co" target="_blank"><img src="https://neap.co/img/neap_color_horizontal.png" alt="Neap Pty Ltd logo" title="Neap" height="89" width="200"/></a></p>
