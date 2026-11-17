#!/usr/bin/env python3
"""Build an offline, dependency-free interactive report from validated JSON."""
import argparse
import html
import json
import math
import re
from pathlib import Path
from urllib.parse import urlparse


def validate(d):
    for key in ('title', 'eyebrow', 'intro', 'question', 'datasetName', 'date'):
        if not isinstance(d.get(key), str) or not d[key].strip():
            raise ValueError(f'{key}: expected nonempty text')
    for key in ('columns', 'categories', 'scopes', 'views', 'rows', 'methods', 'limitations'):
        if not isinstance(d.get(key), list) or not d[key]:
            raise ValueError(f'{key}: expected nonempty list')
    if len(d['categories']) > 3:
        raise ValueError('Starter supports 1–3 categories; extend distribution layout for more.')
    keys = [c['key'] for c in d['columns']]
    cats = [c['id'] for c in d['categories']]
    if len(set(keys)) != len(keys) or len(set(cats)) != len(cats):
        raise ValueError('Column keys and category IDs must be unique')
    if not all(re.fullmatch(r'[a-z][a-z0-9_]*', k) and k not in ('id', 'category') for k in keys):
        raise ValueError('Column keys must be safe identifiers other than id/category')
    for c in d['columns']:
        if not isinstance(c.get('label'), str) or not isinstance(c.get('unit', ''), str):
            raise ValueError('Column label/unit must be text')
    for c in d['categories']:
        if not re.fullmatch(r'[a-z][a-z0-9_-]*', c['id']) or not re.fullmatch(r'#[0-9a-fA-F]{6}', c['color']):
            raise ValueError('Invalid category identifier or hex color')
    if d['target'] not in cats:
        raise ValueError('Unknown target category')
    ids = set()
    for row in d['rows']:
        if type(row.get('id')) is not int or row['id'] in ids or row.get('category') not in cats:
            raise ValueError('Rows need unique integer IDs and a known category')
        ids.add(row['id'])
        for key in keys:
            if type(row.get(key)) not in (int, float) or not math.isfinite(row[key]):
                raise ValueError(f'Row {row["id"]}: {key} must be finite; handle missing values explicitly')
    for scope in d['scopes']:
        if not scope['categories'] or not set(scope['categories']) <= set(cats):
            raise ValueError('Invalid scope categories')
        if not any(r['category'] in scope['categories'] for r in d['rows']):
            raise ValueError('Each scope must contain records')
    for view in d['views']:
        if view['x'] not in keys or view['y'] not in keys or not isinstance(view['observation'], str):
            raise ValueError('Invalid feature view')
    source = d['source']
    parsed = urlparse(source['url'])
    if parsed.scheme not in ('http', 'https') or not parsed.netloc:
        raise ValueError('Source URL must use HTTP(S)')
    for key in ('citation', 'license', 'note'):
        if not isinstance(source[key], str):
            raise ValueError('Source metadata must be text')
    for key in ('methods', 'limitations'):
        if not all(isinstance(x, str) for x in d[key]):
            raise ValueError(f'{key} entries must be text')


def build(source, output):
    data = json.loads(Path(source).read_text(encoding='utf-8'))
    validate(data)
    assets = Path(__file__).resolve().parents[1] / 'assets'
    # Escape HTML raw-text delimiters so data cannot terminate the JSON script.
    payload = json.dumps(data, ensure_ascii=False, allow_nan=False).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
    replacements = {'__TITLE__': html.escape(data['title']), '__CSS__': (assets/'report.css').read_text(), '__JS__': (assets/'report.js').read_text(), '__DATA__': payload}
    # One pass: user text resembling a template token remains user text.
    result = re.sub('|'.join(map(re.escape, replacements)), lambda m: replacements[m.group()], (assets/'report.html').read_text())
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(result, encoding='utf-8')
    print(f'Built {output} ({len(result.encode()):,} bytes; {len(data["rows"])} rows)')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    try:
        build(args.input, args.output)
    except (ValueError, KeyError, TypeError) as exc:
        parser.error(str(exc))
