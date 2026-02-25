# Field Filter

An [Aha! Develop](https://www.aha.io/develop/overview) extension that adds a filter textbox to record drawer headers, allowing you to quickly find fields by name.

When a drawer is open, a "Filter fields..." input appears in the header row. Typing into it hides any attribute rows whose names don't match the query. The description field is also filterable. Clearing the input restores all fields.

## Installing the extension

**Note: In order to install an extension into your Aha! Develop account, you must be an account administrator.**

Install the extension by clicking [here](https://secure.aha.io/settings/account/extensions/install?url=) (update the URL after publishing).

## Working on the extension

Install [`aha-cli`](https://github.com/aha-app/aha-cli):

```sh
npm install -g aha-cli
```

Clone the repo:

```sh
git clone https://github.com/jemmyw/aha-develop-field-filter.git
```

**Note: In order to install an extension into your Aha! Develop account, you must be an account administrator.**

Install the extension into Aha! and set up a watcher:

```sh
aha extension:install
aha extension:watch
```

Now, any change you make inside your working copy will automatically take effect in your Aha! account.

## Building

When you have finished working on your extension, package it into a `.gz` file so that others can install it:

```sh
aha extension:build
```

After building, you can upload the `.gz` file to a publicly accessible URL, such as a GitHub release, so that others can install it using that URL.

To learn more about developing Aha! Develop extensions, including the API reference, the full documentation is located here: [Aha! Develop Extension API](https://www.aha.io/support/develop/extensions)
