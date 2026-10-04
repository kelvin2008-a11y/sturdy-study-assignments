# Sturdy Study · 과제 공유방

과제와 정답을 과목별·회차별로 찾을 수 있는 GitHub Pages 홈페이지입니다.

## 자료 추가하기

1. 이 저장소의 `materials/` 아래 과목 폴더를 선택합니다.
2. 회차 폴더를 만들고 과제와 정답 파일을 넣습니다.
3. `script.js`의 해당 과목 `rounds` 목록에 회차와 파일 경로를 추가합니다.
4. 변경 사항을 저장소에 반영하면 GitHub Pages에 자동 배포됩니다.

예시 구조:

```text
materials/
  math/
    round-01/
      assignment.pdf
      answer.pdf
  physics/
    round-01/
      assignment.pdf
      answer.pdf
```

과목 ID: `math`, `physics`, `chemistry`, `key-of-wisdom`, `liberal-arts`, `more`.

회차 항목은 다음 형식으로 `script.js`의 해당 과목에 추가합니다.

```js
rounds: [
  { name: '01회차', assignment: 'materials/math/round-01/assignment.pdf', answer: 'materials/math/round-01/answer.pdf' },
]
```

자료 공유 전 수업 자료의 공유 허용 범위를 확인하고, 이름·학번 등 개인정보가 포함되지 않도록 해주세요.

## GitHub Pages

`main` 브랜치에 반영하면 `.github/workflows/pages.yml`이 정적 사이트를 배포합니다. 저장소 설정의 Pages 배포 방식이 GitHub Actions로 설정되어 있어야 합니다.
