# uniprot.js

A (partial) JavaScript Uniprot text file parser

## Description

This library allows the parsing of the unirpot native text format and extract some informations. The "partial" term comes here, where only a few fields, needed for our project  are extracted

Each entry comes as a map with sequence, id, accession codes and a selection of features, such as variants, taxonnomy tree, NCBI taxid, corss ref toe PDB structures and so on. The UniprotReaderTest will be the most up to date about which  features are parsed.

### Splice variants

Despite other common parsers, the isoforms are a center place. The 'buildIsoformEntries' will provide a list of protein object, one per described isoform.

See the [project homepage](http://github.com/genentech/uniprot.js).

##How to use

Refer to the unit tests to see the library in action.

To build the distribution

    npm install
    grunt test
    grunt build

To publish, git commit and

    grunt build
    git commit -m 'build'
    npm version patch
    npm publish

## Installation

Using Bower:

    bower install uniprot

Or grab the [source](https://github.com/genentech/uniprot.js/dist/uniprot.js) ([minified](https://github.com/genentech/uniprot.js/dist/uniprot.min.js)).


## Contributing

We'll pull in your contributions if you:

* Provide a comprehensive suite of tests for your fork.
* Have a clear and documented rationale for your changes.
* Package these up in a pull request.

We'll do our best to help you out with any contribution issues you may have.

##Author
(Alexandre Masselot)[masselot.alexandre@gene.com]

## Copyright
2014 Genentech Inc.


## License
BSD. See [LICENSE.txt] in this directory.
