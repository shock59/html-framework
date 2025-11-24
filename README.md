# HTML Framework

A simple "framework" to add additional functionality to HTML.

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