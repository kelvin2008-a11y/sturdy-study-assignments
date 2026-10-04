const subjects = [
  { id: 'math', name: '수학', english: 'MATHEMATICS', icon: '∑', subtitle: '수학 과제 · 유니미 정답', rounds: [] },
  { id: 'physics', name: '물리', english: 'PHYSICS', icon: '↗', subtitle: '물리 과제 · 정답', rounds: [] },
  { id: 'chemistry', name: '화학', english: 'CHEMISTRY', icon: '⚗', subtitle: '화학 과제 · 정답', rounds: [] },
  { id: 'key-of-wisdom', name: '지성의 열쇠', english: 'KEY OF WISDOM', icon: '⌑', subtitle: '지성의 열쇠 과제 · 정답', rounds: [] },
  { id: 'liberal-arts', name: '기타 교양', english: 'LIBERAL ARTS', icon: '✳', subtitle: '기타 교양 과제 · 정답', rounds: [] },
  { id: 'more', name: '그 밖의 과목', english: 'MORE TO COME', icon: '＋', subtitle: '새로운 과목도 함께 추가해요', rounds: [] },
];

const filterRow = document.querySelector('#filters');
const grid = document.querySelector('#subject-grid');
const search = document.querySelector('#search');
const emptyState = document.querySelector('#empty-state');
const resultCount = document.querySelector('#result-count');
let activeFilter = '전체';

function renderFilters() {
  const names = ['전체', ...subjects.map(subject => subject.name)];
  filterRow.innerHTML = names.map(name => `<button class="filter-btn${name === activeFilter ? ' selected' : ''}" type="button" data-filter="${name}" aria-pressed="${name === activeFilter}">${name}</button>`).join('');
  filterRow.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    renderFilters();
    renderSubjects();
  }));
}

function roundMarkup(subject) {
  if (!subject.rounds.length) return '';
  return `<div class="round-list">${subject.rounds.map(round => `
    <div class="round-item"><span class="round-title">${round.name}</span><span class="round-links">
      ${round.assignment ? `<a href="${round.assignment}">과제</a>` : '<span class="disabled">과제 준비 중</span>'}
      ${round.answer ? `<a href="${round.answer}">정답</a>` : '<span class="disabled">정답 준비 중</span>'}
    </span></div>`).join('')}</div>`;
}

function renderSubjects() {
  const query = search.value.trim().toLocaleLowerCase('ko');
  const filtered = subjects.filter(subject => {
    const matchesFilter = activeFilter === '전체' || subject.name === activeFilter;
    const haystack = `${subject.name} ${subject.english} ${subject.subtitle} ${subject.rounds.map(round => round.name).join(' ')}`.toLocaleLowerCase('ko');
    return matchesFilter && haystack.includes(query);
  });
  resultCount.textContent = query || activeFilter !== '전체' ? `${filtered.length}개 과목` : `전체 ${subjects.length}과목`;
  emptyState.hidden = filtered.length !== 0;
  grid.innerHTML = filtered.map((subject, index) => `
    <article class="subject-card" data-subject="${subject.id}">
      <div class="subject-top"><span class="subject-index">SUBJECT / 0${index + 1}</span><span class="subject-icon" aria-hidden="true">${subject.icon}</span></div>
      <h3>${subject.name}</h3><p class="subject-subtitle">${subject.subtitle}</p>
      <div class="round-row"><span class="round-count"><strong>${String(subject.rounds.length).padStart(2, '0')}</strong> ROUNDS</span>
        <button class="open-rounds" type="button" aria-expanded="false">회차 보기 <span aria-hidden="true">＋</span></button></div>
      ${roundMarkup(subject)}
    </article>`).join('');
  grid.querySelectorAll('.open-rounds').forEach(button => button.addEventListener('click', () => {
    const card = button.closest('.subject-card');
    const isOpen = card.classList.toggle('expanded');
    button.setAttribute('aria-expanded', String(isOpen));
    button.innerHTML = isOpen ? '접기 <span aria-hidden="true">−</span>' : '회차 보기 <span aria-hidden="true">＋</span>';
  }));
}

search.addEventListener('input', renderSubjects);
document.addEventListener('keydown', event => {
  if (event.key === '/' && document.activeElement !== search) {
    event.preventDefault();
    search.focus();
  }
  if (event.key === 'Enter' && document.activeElement === search) document.activeElement.blur();
});

renderFilters();
renderSubjects();
