# HTML Framework

A simple "framework" to add additional functionality to HTML. It includes a tool to compile your markup which uses custom components into vanilla HTML to deploy onto any web server, as well as a development server which automatically compiles files when updated for convenience.

Demo video:

https://github.com/user-attachments/assets/8635f475-9fcb-4209-9b2a-c73c898524b4

> [!WARNING]
> This tool is still a work in progress and so bugs may occasionally occur. It is recommended to check the output of the tool before you deploy any websites made using it.

Currently, the additional features added are the `<import>` and `<each>` tags. The `<import>` tag allows you to "import" HTML code from another file. For example, this code:

```html
<!-- components/navbar.html -->
<nav>
  <a href="index.html">Home</a>
  <a href="contact.html">Contact</a>
</nav>
```

```html
<!-- index.html -->
<import src="components/navbar.html" />

<h1>Home page</h1>
```

```html
<!-- contact.html -->
<import src="components/navbar.html" />

<h1>Contact page</h1>
```

Will compile to this:
```html
<!-- index.html -->
<nav>
  <a href="index.html">Home</a>
  <a href="contact.html">Contact</a>
</nav>

<h1>Home page</h1>
```

```html
<!-- contact.html -->
<nav>
  <a href="index.html">Home</a>
  <a href="contact.html">Contact</a>
</nav>

<h1>Contact page</h1>
```

Using imports allows you to stop repeating yourself in every HTML file. You can also specify a place to put custom content inside of an import so it can be used for page layouts, for example:

```html
<!-- components/layout.html -->
<!DOCTYPE html>
<html>
<head>
  <title>My Website</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <contents>

</body>
</html>
```

```html
<!-- page.html -->
<import src="components/layout.html">
  <p>Page content</p>
</import>
```

The `<each>` tag works similarly, however instead of just importing one HTML file it imports every file in a directory. This can be useful if, for example, you have a blog with multiple posts and you want to display them all on one page:

```html
<!--- articles/article1.html --->
<h1>First article</h1>
<p>First article content</p>
```

```html
<!--- articles/article2.html --->
<h1>Second article</h1>
<p>Second article content</p>
```

```html
<!--- articles/blog.html --->
<each src="articles" />
```

This will compile to:
```html
<!--- articles/blog.html --->
<h1>First article</h1>
<p>First article content</p>
<h1>Second article</h1>
<p>Second article content</p>
```

I hope to add more features to this framework in the future. If you have any suggestions, feel free to contact me using the details found on [samv.me](https://samv.me).

## Usage

You will need Node.js installed on your development computer to use this tool, even though you don't need it on the web server you will eventually deploy to. To install the tool, run `npm install @shock59/html-framework --global`.

Create an `input` and an `output` directory (you can alternatively use different names but will have to specify them manually) and put your HTML files which use features from the framework (i.e. `<import>` and `<each>` tags) into the `input` directory. Note that any files inside `input/components` will not be included in the final compiled version (but can still be imported into other files that will be compiled), so it is recommended to put files which will only be used for imports (such as a navigation bar or page layouts) into this directory.

To run the live server, run `html-framework serve`. This will start the live server on port 3000, serving files from the `input` directory. To compile your files without using the live server, run `html-framework compile`. This will compile all files in the `input` directory into the `output` directory. To learn about more options, such as specifying custom input and output directories, run `html-framework help`.

### Using from source

Instead of using npm you can alternatively use the project from source. Clone the repository by running `git clone https://github.com/shock59/html-framework` and cd into the directory. Run `npm install` to install the required dependencies. Then instead of running `html-framework`, run `npm run dev --`.