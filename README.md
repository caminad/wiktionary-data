# Wiktionary data

English Wiktionary titles organized by number of characters.

## Example usage

```sh
❯ curl -s https://caminad.github.io/wiktionary-data/005.txt | grep th.nk | sed 's|.*|- [&](https://en.wiktionary.org/wiki/&)|g'
- [thank](https://en.wiktionary.org/wiki/thank)
- [think](https://en.wiktionary.org/wiki/think)
- [thonk](https://en.wiktionary.org/wiki/thonk)
- [thunk](https://en.wiktionary.org/wiki/thunk)
```

## Updating

Requires [Deno](https://deno.land/#installation).

```sh
❯ ./scripts/update.ts
```

## Source

[https://dumps.wikimedia.org/enwiktionary/latest/](https://dumps.wikimedia.org/enwiktionary/latest/)[**enwiktionary-latest-all-titles-in-ns0.gz**](https://dumps.wikimedia.org/enwiktionary/latest/enwiktionary-latest-all-titles-in-ns0.gz)
