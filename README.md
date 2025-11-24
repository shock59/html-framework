# HTML Framework

A simple "framework" to add additional functionality to HTML. It includes a tool to compile your markup which uses custom components into vanilla HTML to deploy onto any web server, as well as a development server which automatically compiles files when updated for convenience.

Currently, the only additional feature added is the `<import>` tag, which allows you to "import" HTML code from another file. For example, this code:

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

## Usage

Clone the repository by running `git clone https://github.com/shock59/html-framework` and cd into the directory. Run `npm install` to install the required dependencies.

Create an `input` and an `output` directory and put your HTML files which use features from the framework (i.e. `<import>` tags) into the `input` directory. Note that any files inside `input/components` will not be included in the final compiled version (but can still be imported into other files that will be compiled), so it is recommended to put files which will only be used for imports (such as a navigation bar or page layouts) into this directory.

To run the live server, run `npm run dev -- serve`. This will start the live server on port 3000, serving files from the `input` directory.

To compile your files without using the live server, run `npm run dev -- compile`. This will compile all files in the `input` directory into the `output` directory.