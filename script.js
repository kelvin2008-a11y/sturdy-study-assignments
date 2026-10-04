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
const uploadList = document.querySelector('#upload-list');
const welcomeDialog = document.querySelector('#welcome-dialog');
const skipWelcome = document.querySelector('#skip-welcome');
const uploadDialog = document.querySelector('#upload-dialog');
const unlockDialog = document.querySelector('#unlock-dialog');
const uploadFormUrl = 'https://github.com/kelvin2008-a11y/sturdy-study-assignments/issues/new?template=material-upload.yml';
const ENCRYPTION_ITERATIONS = 600000;
const ENCRYPTION_MAGIC = new TextEncoder().encode('STUDYENC');
const ENCRYPTION_AAD = new TextEncoder().encode('SturdyStudyEncryptedFileV1');
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
    <div class="round-item"><span class="round-title">${escapeHtml(round.name)}</span><span class="round-links">
      ${round.files.map(file => file.encrypted
        ? `<a href="${escapeHtml(file.url)}" target="_blank" rel="noreferrer">🔒 암호화 ZIP</a><button class="unlock-button" type="button" data-url="${escapeHtml(file.url)}">비밀번호로 열기</button>`
        : `<a href="${escapeHtml(file.url)}" target="_blank" rel="noreferrer">${escapeHtml(file.name)}</a>`).join('')}
    </span></div>`).join('')}</div>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
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
  grid.querySelectorAll('.unlock-button').forEach(button => button.addEventListener('click', () => openUnlockDialog(button.dataset.url)));
}

function fieldValue(body, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = body.match(new RegExp(`^### ${escaped}\\s*\\r?\\n([\\s\\S]*?)(?=\\n### |$)`, 'm'));
  return match ? match[1].trim().replace(/^_No response_$/i, '') : '';
}

function uploadedFiles(body) {
  const found = new Map();
  const markdownLink = /\[([^\]]+)\]\((https:\/\/github\.com\/user-attachments\/(?:files|assets)\/[^)\s]+|https:\/\/user-images\.githubusercontent\.com\/[^)\s]+)\)/g;
  for (const match of body.matchAll(markdownLink)) {
    try {
      const url = new URL(match[2]);
      const isGithubAttachment = url.hostname === 'github.com' && url.pathname.startsWith('/user-attachments/');
      const isGithubImage = url.hostname === 'user-images.githubusercontent.com';
      if (isGithubAttachment || isGithubImage) found.set(url.href, match[1].trim() || '파일 다운로드');
    } catch { /* Ignore malformed links in public submissions. */ }
  }
  return [...found.entries()].map(([url, name]) => ({ url, name }));
}

function renderUploads(issues) {
  const submissions = issues.filter(issue => !issue.pull_request).map(issue => {
    const body = issue.body || '';
    return {
      title: fieldValue(body, '과목') || '기타 자료',
      round: fieldValue(body, '회차') || '회차 미기재',
      type: fieldValue(body, '자료 종류') || '자료',
      encrypted: /\[x\].*파일 암호화 도구/i.test(fieldValue(body, '암호화 확인')),
      issueUrl: issue.html_url,
      date: new Date(issue.created_at),
      files: uploadedFiles(body),
    };
  }).filter(item => item.files.length).sort((a, b) => b.date - a.date);

  subjects.forEach(subject => { subject.rounds = []; });
  submissions.forEach(submission => {
    const subject = subjects.find(item => item.name === submission.title);
    if (!subject) return;
    let round = subject.rounds.find(item => item.name === submission.round);
    if (!round) {
      round = { name: submission.round, files: [] };
      subject.rounds.push(round);
    }
    submission.files.forEach(file => round.files.push({ ...file, name: file.name, type: submission.type, encrypted: submission.encrypted }));
  });
  subjects.forEach(subject => subject.rounds.sort((a, b) => b.name.localeCompare(a.name, 'ko', { numeric: true })));
  renderSubjects();

  if (!submissions.length) {
    uploadList.innerHTML = '<p class="no-uploads">아직 등록된 자료가 없어요. 첫 자료를 공유해 주세요.</p>';
    return;
  }

  uploadList.replaceChildren();
  submissions.slice(0, 12).forEach(item => {
    const card = document.createElement('article');
    card.className = 'upload-item';
    const details = document.createElement('div');
    details.className = 'upload-details';
    const subject = document.createElement('span');
    subject.className = 'upload-subject';
    subject.textContent = item.title;
    const title = document.createElement('strong');
    title.textContent = `${item.round} · ${item.type}`;
    const date = document.createElement('span');
    date.className = 'upload-date';
    date.textContent = Number.isNaN(item.date.getTime()) ? '' : item.date.toLocaleDateString('ko-KR');
    details.append(subject, title, date);
    const links = document.createElement('div');
    links.className = 'download-links';
    item.files.forEach(file => {
      if (item.encrypted) {
        const link = document.createElement('a');
        link.href = file.url;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.textContent = '↓ 암호화 ZIP';
        links.append(link);
        const unlock = document.createElement('button');
        unlock.className = 'unlock-button';
        unlock.type = 'button';
        unlock.textContent = '비밀번호로 열기';
        unlock.addEventListener('click', () => openUnlockDialog(file.url));
        links.append(unlock);
      } else {
        const link = document.createElement('a');
        link.href = file.url;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.textContent = `↓ ${file.name}`;
        links.append(link);
      }
    });
    const issueLink = document.createElement('a');
    issueLink.className = 'submission-link';
    issueLink.href = item.issueUrl;
    issueLink.target = '_blank';
    issueLink.rel = 'noreferrer';
    issueLink.textContent = '정보 ↗';
    links.append(issueLink);
    card.append(details, links);
    uploadList.append(card);
  });
}

async function loadUploads() {
  try {
    const url = new URL('https://api.github.com/repos/kelvin2008-a11y/sturdy-study-assignments/issues');
    url.searchParams.set('state', 'all');
    url.searchParams.set('labels', '자료공유');
    url.searchParams.set('per_page', '100');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    renderUploads(await response.json());
  } catch {
    uploadList.innerHTML = '<p class="no-uploads">자료 목록을 불러오지 못했어요. 잠시 뒤 다시 방문해 주세요. <a href="https://github.com/kelvin2008-a11y/sturdy-study-assignments/issues?q=is%3Aissue+label%3A%22%EC%9E%90%EB%A3%8C%EA%B3%B5%EC%9C%A0%22" target="_blank" rel="noreferrer">GitHub에서 자료 보기 ↗</a></p>';
  }
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeStoredZip(filename, bytes) {
  const name = new TextEncoder().encode(filename);
  const crc = crc32(bytes);
  const local = new Uint8Array(30 + name.length);
  const localView = new DataView(local.buffer);
  localView.setUint32(0, 0x04034b50, true);
  localView.setUint16(4, 20, true);
  localView.setUint16(6, 0, true);
  localView.setUint16(8, 0, true);
  localView.setUint32(14, crc, true);
  localView.setUint32(18, bytes.length, true);
  localView.setUint32(22, bytes.length, true);
  localView.setUint16(26, name.length, true);
  local.set(name, 30);

  const central = new Uint8Array(46 + name.length);
  const centralView = new DataView(central.buffer);
  centralView.setUint32(0, 0x02014b50, true);
  centralView.setUint16(4, 20, true);
  centralView.setUint16(6, 20, true);
  centralView.setUint16(8, 0, true);
  centralView.setUint16(10, 0, true);
  centralView.setUint32(16, crc, true);
  centralView.setUint32(20, bytes.length, true);
  centralView.setUint32(24, bytes.length, true);
  centralView.setUint16(28, name.length, true);
  centralView.setUint32(42, local.length + bytes.length, true);
  central.set(name, 46);

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, 1, true);
  endView.setUint16(10, 1, true);
  endView.setUint32(12, central.length, true);
  endView.setUint32(16, local.length + bytes.length, true);
  return new Blob([local, bytes, central, end], { type: 'application/zip' });
}

async function deriveFileKey(password, salt, usage) {
  const passwordKey = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ENCRYPTION_ITERATIONS, hash: 'SHA-256' },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    [usage],
  );
}

async function encryptFileToZip(file, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveFileKey(password, salt, 'encrypt');
  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const metadata = new TextEncoder().encode(JSON.stringify({ filename: file.name, mime: file.type || 'application/octet-stream' }));
  const plain = new Uint8Array(4 + metadata.length + fileBytes.length);
  new DataView(plain.buffer).setUint32(0, metadata.length, false);
  plain.set(metadata, 4);
  plain.set(fileBytes, 4 + metadata.length);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: ENCRYPTION_AAD }, key, plain,
  ));
  const packageBytes = new Uint8Array(40 + ciphertext.length);
  packageBytes.set(ENCRYPTION_MAGIC, 0);
  new DataView(packageBytes.buffer).setUint32(8, ENCRYPTION_ITERATIONS, false);
  packageBytes.set(salt, 12);
  packageBytes.set(iv, 28);
  packageBytes.set(ciphertext, 40);
  return makeStoredZip('sturdy-study.enc', packageBytes);
}

async function readEncryptedZip(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const method = view.getUint16(offset + 8, true);
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const name = new TextDecoder().decode(bytes.slice(nameStart, nameStart + nameLength));
    const dataStart = nameStart + nameLength + extraLength;
    const dataEnd = dataStart + size;
    if (dataEnd > bytes.length) throw new Error('손상된 ZIP 파일입니다.');
    if (name === 'sturdy-study.enc') {
      if (method !== 0) throw new Error('홈페이지에서 만든 암호화 ZIP을 선택해 주세요.');
      return bytes.slice(dataStart, dataEnd);
    }
    offset = dataEnd;
  }
  throw new Error('암호화 파일을 찾지 못했습니다. 홈페이지에서 만든 ZIP인지 확인해 주세요.');
}

async function decryptZipFile(file, password) {
  const packageBytes = await readEncryptedZip(file);
  if (packageBytes.length < 56 || !ENCRYPTION_MAGIC.every((byte, index) => packageBytes[index] === byte)) {
    throw new Error('이 ZIP은 Sturdy Study 암호화 파일이 아닙니다.');
  }
  const iterations = new DataView(packageBytes.buffer, packageBytes.byteOffset, packageBytes.byteLength).getUint32(8, false);
  if (iterations !== ENCRYPTION_ITERATIONS) throw new Error('지원하지 않는 암호화 설정입니다.');
  const salt = packageBytes.slice(12, 28);
  const iv = packageBytes.slice(28, 40);
  const key = await deriveFileKey(password, salt, 'decrypt');
  const plain = new Uint8Array(await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: ENCRYPTION_AAD }, key, packageBytes.slice(40),
  ));
  if (plain.length < 4) throw new Error('암호화된 파일이 손상되었습니다.');
  const metadataLength = new DataView(plain.buffer, plain.byteOffset, plain.byteLength).getUint32(0, false);
  if (metadataLength > plain.length - 4) throw new Error('파일 이름 정보를 읽을 수 없습니다.');
  const metadata = JSON.parse(new TextDecoder().decode(plain.slice(4, 4 + metadataLength)));
  const filename = String(metadata.filename || '자료').replace(/[\\/:*?"<>|]/g, '_');
  return {
    filename,
    blob: new Blob([plain.slice(4 + metadataLength)], { type: metadata.mime || 'application/octet-stream' }),
  };
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function openUnlockDialog(url) {
  document.querySelector('#encrypted-download').href = url;
  document.querySelector('#unlock-file').value = '';
  document.querySelector('#unlock-password').value = '';
  document.querySelector('#unlock-status').textContent = '';
  unlockDialog.showModal();
}

document.querySelectorAll('#upload-link, .upload-button').forEach(link => link.addEventListener('click', event => {
  event.preventDefault();
  uploadDialog.showModal();
}));
document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => {
  document.querySelector(`#${button.dataset.closeDialog}`).close();
}));

document.querySelector('#encrypt-button').addEventListener('click', async () => {
  const file = document.querySelector('#encrypt-file').files[0];
  const password = document.querySelector('#encrypt-password').value;
  const confirmation = document.querySelector('#encrypt-confirm').value;
  const status = document.querySelector('#encrypt-status');
  const button = document.querySelector('#encrypt-button');
  const prepared = document.querySelector('#prepared-link');
  const next = document.querySelector('#continue-upload');
  prepared.hidden = true;
  next.hidden = true;
  if (!file) { status.textContent = '먼저 암호화할 파일을 선택해 주세요.'; return; }
  if (file.size > 20 * 1024 * 1024) { status.textContent = '파일은 20MB 이하로 선택해 주세요.'; return; }
  if (password.length < 12) { status.textContent = '비밀번호는 12자 이상으로 설정해 주세요.'; return; }
  if (password !== confirmation) { status.textContent = '비밀번호가 서로 다릅니다.'; return; }
  if (!crypto.subtle) { status.textContent = '이 브라우저에서는 보안 암호화를 사용할 수 없습니다.'; return; }
  button.disabled = true;
  status.textContent = '브라우저 안에서 파일을 암호화하고 있어요…';
  try {
    const encryptedZip = await encryptFileToZip(file, password);
    prepared.href = URL.createObjectURL(encryptedZip);
    prepared.download = 'sturdy-study-encrypted.zip';
    prepared.hidden = false;
    next.href = uploadFormUrl;
    next.hidden = false;
    status.textContent = '암호화가 끝났어요. ZIP을 저장한 뒤 게시 양식에 첨부하세요. 비밀번호는 꼭 따로 전달해 주세요.';
  } catch {
    status.textContent = '암호화 중 문제가 생겼어요. 페이지를 새로고침하고 다시 시도해 주세요.';
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#unlock-button').addEventListener('click', async () => {
  const file = document.querySelector('#unlock-file').files[0];
  const password = document.querySelector('#unlock-password').value;
  const status = document.querySelector('#unlock-status');
  const button = document.querySelector('#unlock-button');
  if (!file) { status.textContent = '먼저 내려받은 암호화 ZIP을 선택해 주세요.'; return; }
  if (!password) { status.textContent = '게시자가 알려 준 비밀번호를 입력해 주세요.'; return; }
  button.disabled = true;
  status.textContent = '비밀번호를 확인하고 파일을 여는 중이에요…';
  try {
    const result = await decryptZipFile(file, password);
    saveBlob(result.blob, result.filename);
    status.textContent = '잠금 해제된 파일을 저장했어요.';
  } catch (error) {
    status.textContent = error instanceof DOMException && error.name === 'OperationError'
      ? '비밀번호가 맞지 않거나 파일이 손상되었어요.'
      : (error.message || '파일 잠금을 해제하지 못했습니다.');
  } finally {
    button.disabled = false;
  }
});

function dismissWelcome() {
  if (skipWelcome.checked) {
    try { localStorage.setItem('sturdyStudyWelcomeSeen', 'true'); } catch { /* Storage may be disabled. */ }
  }
  welcomeDialog.close();
}

document.querySelector('#guide-link').addEventListener('click', event => {
  event.preventDefault();
  welcomeDialog.showModal();
});
document.querySelector('.welcome-close').addEventListener('click', dismissWelcome);
document.querySelector('#welcome-start').addEventListener('click', () => {
  dismissWelcome();
  document.querySelector('#library').scrollIntoView({ behavior: 'smooth' });
});
welcomeDialog.addEventListener('cancel', event => {
  event.preventDefault();
  dismissWelcome();
});

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
loadUploads();
try {
  if (!localStorage.getItem('sturdyStudyWelcomeSeen')) welcomeDialog.showModal();
} catch {
  welcomeDialog.showModal();
}
