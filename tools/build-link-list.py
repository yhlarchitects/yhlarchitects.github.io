"""Generate the public link directory from HTML already included in the site output."""
from pathlib import Path
from html import escape
from html.parser import HTMLParser
from datetime import datetime, timezone
from urllib.parse import quote, urlsplit
import json
import re

ORIGIN = 'https://yhlarchitects.com'
GROUPS = [('project', '프로젝트·작업'), ('writing', '글·여행'), ('tools', '학습·도구'), ('other', '기타')]
OVERRIDES = {
    '/': ('YHLA', '건축 작업과 소개', 'project', '사이트'),
    '/writing/sejong-ui-nara/': ('세종의 나라 독후감', '최신 합본 「니은과 이응」과 후보 다섯 편. 산돌명조로 한 쪽씩 읽기.', 'writing', '읽기'),
    '/thesis/yongsan/': ('용산 공영주차장 팀 보드', '설계공모 일정과 자료, 한국어·영어 팀 보드', 'project', '공모'),
    '/thesis/royal/': ('로열층', '대본 읽기', 'writing', '대본'),
    '/thesis/myeongdang/': ('명당', '대본 읽기', 'writing', '대본'),
    '/thesis/d364/': ('D-364', '대본 읽기', 'writing', '대본'),
    '/thesis/zhuangzi/': ('장자 강의 노트', '강의와 읽기 노트', 'writing', '읽기'),
    '/thesis/torino/': ('토리노, 세 가지 길', '토리노 여행의 세 가지 구성', 'writing', '여행'),
    '/thesis/torino/plan/': ('토리노 2박 3일', '2026.10.16~18 여행 계획', 'writing', '여행'),
    '/thesis/zurich/': ('취리히 건축 수첩', 'Open House Zürich 방문 수첩', 'writing', '답사'),
    '/thesis/zurich/20260926/': ('취리히 건축 수첩 · 9월 26일', 'Open House Zürich 방문 수첩', 'writing', '답사'),
    '/thesis/zurich/20260927/': ('취리히 건축 수첩 · 9월 27일', '취리히 건축 방문 수첩', 'writing', '답사'),
    '/thesis/zurich/20260927-atelier/': ('취리히 아틀리에 수첩', '2026.09.27 아틀리에 방문 수첩', 'writing', '답사'),
    '/thesis/deutsch/': ('독일어 공부 노트', '2628 · 독일어 학습 앱', 'tools', '학습'),
    '/thesis/deutsch/v1.html': ('독일어 공부 노트 · 첫 판', '독일어 학습 앱의 이전 판', 'tools', '이전판'),
    '/thesis/study-preview/': ('공부 노트 미리보기', '학습 앱 미리보기', 'tools', '미리보기'),
    '/thesis/english/': ('영어 공부 노트', '2629 · 영어 학습 앱', 'tools', '학습'),
    '/bangyeol/': ('방결', '내 방에도 나의 결이 있다', 'tools', '도구'),
    '/bangyeol/v3/': ('방결 · v3', '내 방에도 나의 결이 있다 · v3 페이지', 'tools', 'v3'),
}

class PageInfo(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_title = False
        self.title = ''
        self.description = ''
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'title': self.in_title = True
        if tag == 'meta' and attrs.get('name', '').lower() == 'description':
            self.description = attrs.get('content', '')
    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
    def handle_data(self, data):
        if self.in_title: self.title += data

def plain(value):
    return re.sub(r'\s+', ' ', str(value)).strip().replace(chr(0x2014), ', ').replace(chr(0x2013), '-')

def page_url(path):
    text = path.as_posix()
    if text == 'index.html': return '/'
    if text.endswith('/index.html'): text = text[:-10]
    return '/' + quote(text, safe='/.-')

def build_link_list(output, template, extras=None):
    output = Path(output)
    template = Path(template)
    extras = Path(extras) if extras else template.with_name('extra-links.json')
    pages = []
    for path in sorted(output.rglob('*.html')):
        relative = path.relative_to(output)
        if relative.parts[0] in ('list', 'assets') or relative.name.startswith('.'):
            continue
        parser = PageInfo()
        parser.feed(path.read_text(encoding='utf-8-sig'))
        route = page_url(relative)
        title = plain(parser.title) or plain(relative.stem)
        description = plain(parser.description)
        kind = 'project' if route.startswith('/project/') or route == '/' else 'tools' if any(x in route for x in ('/tools/', '/apps/', '/study', '/deutsch', '/english', '/bangyeol')) else 'writing' if route.startswith('/writing/') else 'other'
        badge = '페이지'
        if route in OVERRIDES:
            title, description, kind, badge = OVERRIDES[route]
        pages.append({'url':ORIGIN + route, 'path':route, 'title':title, 'description':description, 'group':kind, 'badge':badge, 'external':False})
    if extras.exists():
        for entry in json.loads(extras.read_text(encoding='utf-8')):
            parsed = urlsplit(entry['url'])
            if parsed.scheme != 'https' or parsed.username or parsed.password or parsed.query:
                raise ValueError('추가 링크는 비밀값이나 쿼리 없는 HTTPS 주소여야 합니다.')
            pages.append({**entry, 'external':True, 'path':entry['url']})
    seen = set()
    for page in pages:
        if page['group'] not in dict(GROUPS): raise ValueError('알 수 없는 분류: ' + page['group'])
        if page['url'] in seen: raise ValueError('중복 주소: ' + page['url'])
        seen.add(page['url'])
    pages.sort(key=lambda p: (0 if '/writing/sejong-ui-nara/' in p['url'] else 1, p['title'].casefold(), p['url']))
    parts = []
    for kind, label in GROUPS:
        group = [p for p in pages if p['group'] == kind]
        if not group: continue
        rows = []
        for page in group:
            featured = ' featured' if '/writing/sejong-ui-nara/' in page['url'] else ''
            title = escape(plain(page['title']))
            search = escape(plain(' '.join(str(page.get(k, '')) for k in ('title','description','path','badge'))).lower(), quote=True)
            address = escape(page['url'].removeprefix('https://'))
            rows.append('<li class="list-row' + featured + '" data-search="' + search + '"><a href="' + escape(page['url'], quote=True) + '" target="_blank" rel="noopener"><span class="list-row-title"><strong>' + title + '</strong><span class="open-mark" aria-hidden="true">↗</span></span><span class="list-row-description">' + escape(plain(page.get('description',''))) + '</span><span class="list-row-address"><span class="address">' + address + '</span><span class="state">' + escape(plain(page.get('badge','페이지'))) + '</span></span></a></li>')
        parts.append('<section class="list-column" aria-labelledby="group-' + kind + '"><header class="list-column-heading"><h2 id="group-' + kind + '">' + label + '</h2><span class="group-count" data-total="' + str(len(group)) + '">' + str(len(group)).zfill(2) + '</span></header><ul class="list-links">' + '\n'.join(rows) + '</ul><p class="list-empty" hidden>검색 결과가 없습니다.</p></section>')
    stamp = datetime.now(timezone.utc).isoformat(timespec='seconds')
    html = template.read_text(encoding='utf-8').replace('{{LINK-GROUPS}}', '\n'.join(parts)).replace('{{TOTAL}}', str(len(pages))).replace('{{UPDATED}}', stamp)
    html = html.replace(chr(0x2014), ', ').replace(chr(0x2013), '-')
    target = output / 'list'
    target.mkdir(exist_ok=True)
    (target / 'index.html').write_text(html, encoding='utf-8', newline='\n')
    (target / 'pages.json').write_text(json.dumps({'generatedAt':stamp, 'count':len(pages), 'pages':pages}, ensure_ascii=False, indent=2), encoding='utf-8', newline='\n')
    print(json.dumps({'linkList':len(pages), 'internal':sum(not p['external'] for p in pages), 'external':sum(p['external'] for p in pages)}, ensure_ascii=False))
    return pages
