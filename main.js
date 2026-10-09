import { supabaseUrl, supabaseAnonKey } from './config.js';

const $ = (selector) => document.querySelector(selector);
const form = $('#portfolioForm');
const preview = $('#portfolioPreview');
const toast = $('#toast');
const authModal = $('#authModal');
const authForm = $('#authForm');
const photoInput = $('#profilePhoto');
let supabase = null;
let currentUser = null;
let selectedTemplate = 'simple';
let selectedPhoto = null;
let photoObjectUrl = '';
let savedPortfolioId = null;
let authMode = 'login';
let toastTimer;

const defaults = {
  full_name: '', profile_picture_url: '', email: '', phone: '', address: '', about: '',
  education: [], skills: [], projects: [], experience: [], social_links: [], template: 'simple'
};

function notify(message, isError = false) {
  toast.textContent = message;
  toast.style.background = isError ? '#a54337' : '';
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3600);
}

function setConnection(message, state = '') {
  $('#connectionText').textContent = message;
  $('#connectionStatus').classList.toggle('is-ready', state === 'ready');
  $('#connectionStatus').classList.toggle('is-error', state === 'error');
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function safeUrl(value = '') {
  try {
    const url = new URL(value, window.location.href);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function safeImageUrl(value = '') {
  return value.startsWith('blob:') ? value : safeUrl(value);
}

function lines(value) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function initials(name) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'P';
}

function setPhotoPreview(url, name) {
  const target = $('#photoPreview');
  target.replaceChildren();
  if (url && safeImageUrl(url)) {
    const image = document.createElement('img');
    image.src = url;
    image.alt = '';
    target.append(image);
  } else {
    target.textContent = initials(name);
  }
}

function readForm() {
  const data = new FormData(form);
  const entries = lines(data.get('education') || '');
  const projectEntries = lines(data.get('projects') || '').map((line) => {
    const [name = '', description = '', url = ''] = line.split('|').map((part) => part.trim());
    return { name, description, url: safeUrl(url) };
  });
  const experienceEntries = lines(data.get('experience') || '').map((line) => {
    const [role = '', dates = '', description = ''] = line.split('|').map((part) => part.trim());
    return { role, dates, description };
  });
  const socialLinks = lines(data.get('links') || '').map((line) => {
    const [label = '', url = ''] = line.split('|').map((part) => part.trim());
    return { label, url: safeUrl(url) };
  }).filter((item) => item.url);
  return {
    ...defaults,
    full_name: data.get('full_name').trim(),
    email: data.get('email').trim(),
    phone: data.get('phone').trim(),
    address: data.get('address').trim(),
    about: data.get('about').trim(),
    education: entries,
    skills: (data.get('skills') || '').split(',').map((item) => item.trim()).filter(Boolean),
    projects: projectEntries,
    experience: experienceEntries,
    social_links: socialLinks,
    template: selectedTemplate
  };
}

function section(title, content) {
  if (!content) return '';
  return `<section><p class="preview-section-label">${escapeHtml(title)}</p>${content}</section>`;
}

function renderList(items, getText) {
  if (!items.length) return '';
  return `<ul class="preview-list">${items.map((item) => `<li>${getText(item)}</li>`).join('')}</ul>`;
}

function renderPortfolio() {
  const data = readForm();
  const photo = selectedPhoto && photoObjectUrl ? photoObjectUrl : data.profile_picture_url;
  const avatar = `<div class="preview-avatar">${photo && safeImageUrl(photo) ? `<img src="${escapeHtml(safeImageUrl(photo))}" alt="${escapeHtml(data.full_name || 'Profile picture')}">` : escapeHtml(initials(data.full_name))}</div>`;
  const description = escapeHtml(data.about || 'Your introduction will appear here. Tell people what you do and what you are looking for.');
  const skills = data.skills.length ? `<div class="preview-chips">${data.skills.map((skill) => `<span class="preview-chip">${escapeHtml(skill)}</span>`).join('')}</div>` : '<p class="preview-list">Add a few of your strongest skills.</p>';
  const education = renderList(data.education, (item) => escapeHtml(item));
  const projects = renderList(data.projects, (item) => `<strong>${escapeHtml(item.name || 'Project')}</strong>${item.description ? `: ${escapeHtml(item.description)}` : ''}${item.url ? ` <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">View</a>` : ''}`);
  const experience = renderList(data.experience, (item) => `<strong>${escapeHtml(item.role || 'Experience')}</strong>${item.dates ? ` · ${escapeHtml(item.dates)}` : ''}${item.description ? `<br>${escapeHtml(item.description)}` : ''}`);
  const links = data.social_links.length ? `<div class="preview-links">${data.social_links.map((item) => `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label || 'Website')} ↗</a>`).join('')}</div>` : '';
  const contact = [data.email, data.phone, data.address].filter(Boolean).map(escapeHtml).join(' · ');
  const contactBlock = contact ? `<p class="preview-list">${contact}</p>` : '';

  preview.className = `portfolio-preview template-${selectedTemplate}`;
  $('#previewTemplateName').textContent = `${selectedTemplate.toUpperCase()} TEMPLATE`;

  if (selectedTemplate === 'simple') {
    preview.innerHTML = `<div class="preview-empty">${avatar}<h3>${escapeHtml(data.full_name || 'Your name here')}</h3><p>${description}</p>${contactBlock}</div>${section('Selected skills', skills)}${section('Education', education)}${section('Selected projects', projects)}${section('Experience', experience)}${section('Find me', links)}`;
    return;
  }

  if (selectedTemplate === 'modern') {
    preview.innerHTML = `<aside class="modern-rail">${avatar}<h3>${escapeHtml(data.full_name || 'Your name here')}</h3><p>${description}</p>${section('Connect', contactBlock)}${section('Skills', skills)}${section('Find me', links)}</aside><div class="modern-main"><p class="preview-kicker">PORTFOLIO / ${new Date().getFullYear()}</p><h3 class="preview-title">Selected work<br>&amp; experience</h3>${section('Projects', projects)}${section('Experience', experience)}${section('Education', education)}</div>`;
    return;
  }

  preview.innerHTML = `<div class="creative-top"><div class="preview-empty">${avatar}<h3>${escapeHtml(data.full_name || 'Your name here')}</h3><p>${description}</p></div></div><div class="creative-body"><section class="creative-block">${section('Good at', skills)}</section><section class="creative-block">${section('Learning', education)}</section><section class="creative-block">${section('Making', projects)}</section><section class="creative-block">${section('Experience', experience)}</section></div>${links}${contact ? `<div class="creative-block">${section('Say hello', contactBlock)}</div>` : ''}`;
}

function populateForm(row) {
  form.elements.full_name.value = row.full_name || '';
  form.elements.email.value = row.email || '';
  form.elements.phone.value = row.phone || '';
  form.elements.address.value = row.address || '';
  form.elements.about.value = row.about || '';
  form.elements.education.value = (row.education || []).join('\n');
  form.elements.skills.value = (row.skills || []).join(', ');
  form.elements.projects.value = (row.projects || []).map((item) => [item.name, item.description, item.url].filter(Boolean).join(' | ')).join('\n');
  form.elements.experience.value = (row.experience || []).map((item) => [item.role, item.dates, item.description].filter(Boolean).join(' | ')).join('\n');
  form.elements.links.value = (row.social_links || []).map((item) => `${item.label} | ${item.url}`).join('\n');
  form.dataset.photoUrl = row.profile_picture_url || '';
  savedPortfolioId = row.id || null;
  chooseTemplate(row.template || 'simple');
  setPhotoPreview(row.profile_picture_url || '', row.full_name || '');
  renderPortfolio();
}

function chooseTemplate(template) {
  selectedTemplate = ['simple', 'modern', 'creative'].includes(template) ? template : 'simple';
  document.querySelectorAll('.template-choice').forEach((button) => {
    const selected = button.dataset.template === selectedTemplate;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  renderPortfolio();
}

function updateAccountUI() {
  $('#accountButton').textContent = currentUser ? currentUser.email : 'Log in';
  $('#accountButton').title = currentUser ? 'Manage account' : 'Log in or create an account';
  $('#signupButton').hidden = Boolean(currentUser);
  $('#logoutButton').hidden = !currentUser;
  $('#deleteButton').disabled = !currentUser || !savedPortfolioId;
  $('#saveHint').textContent = currentUser ? 'Saved to your private cloud profile.' : 'Sign in to save to your cloud account.';
}

async function loadPortfolio(showMessage = true) {
  if (!supabase || !currentUser) {
    openAuth();
    return;
  }
  const { data, error } = await supabase.from('portfolios').select('*').eq('user_id', currentUser.id).maybeSingle();
  if (error) {
    notify(`Could not load portfolio: ${error.message}`, true);
    return;
  }
  if (!data) {
    savedPortfolioId = null;
    if (!form.elements.full_name.value && currentUser.user_metadata?.full_name) {
      form.elements.full_name.value = currentUser.user_metadata.full_name;
      renderPortfolio();
    }
    updateAccountUI();
    if (showMessage) notify('No saved portfolio yet. Fill in your details and save.');
    return;
  }
  populateForm(data);
  updateAccountUI();
  if (showMessage) notify('Your saved portfolio is loaded.');
}

async function uploadPhoto() {
  if (!selectedPhoto) return form.dataset.photoUrl || '';
  const extension = selectedPhoto.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${currentUser.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('profile-photos').upload(path, selectedPhoto, { upsert: true, contentType: selectedPhoto.type });
  if (error) throw error;
  return supabase.storage.from('profile-photos').getPublicUrl(path).data.publicUrl;
}

form.addEventListener('input', renderPortfolio);
form.addEventListener('change', renderPortfolio);

document.querySelectorAll('.template-choice').forEach((button) => {
  button.addEventListener('click', () => chooseTemplate(button.dataset.template));
});

document.querySelectorAll('.gallery-select').forEach((button) => {
  button.addEventListener('click', () => {
    chooseTemplate(button.dataset.template);
    $('#studio').scrollIntoView({ behavior: 'smooth' });
  });
});

photoInput.addEventListener('change', () => {
  const chosenPhoto = photoInput.files?.[0] || null;
  if (chosenPhoto && (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(chosenPhoto.type) || chosenPhoto.size > 5 * 1024 * 1024)) {
    photoInput.value = '';
    notify('Choose a JPG, PNG, WebP, or GIF image under 5 MB.', true);
    return;
  }
  selectedPhoto = chosenPhoto;
  if (photoObjectUrl) URL.revokeObjectURL(photoObjectUrl);
  photoObjectUrl = selectedPhoto ? URL.createObjectURL(selectedPhoto) : '';
  if (selectedPhoto && !selectedPhoto.type.startsWith('image/')) {
    selectedPhoto = null;
    photoObjectUrl = '';
    photoInput.value = '';
    notify('Choose an image file for your profile picture.', true);
    return;
  }
  setPhotoPreview(photoObjectUrl || form.dataset.photoUrl || '', form.elements.full_name.value);
  renderPortfolio();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabase || !currentUser) {
    openAuth();
    return;
  }
  const submitButton = form.querySelector('[type="submit"]');
  submitButton.disabled = true;
  try {
    const profilePictureUrl = await uploadPhoto();
    const portfolio = { ...readForm(), user_id: currentUser.id, profile_picture_url: profilePictureUrl, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('portfolios').upsert(portfolio, { onConflict: 'user_id' }).select('id').single();
    if (error) throw error;
    savedPortfolioId = data.id;
    form.dataset.photoUrl = profilePictureUrl;
    selectedPhoto = null;
    if (photoObjectUrl) URL.revokeObjectURL(photoObjectUrl);
    photoObjectUrl = '';
    photoInput.value = '';
    setPhotoPreview(profilePictureUrl, portfolio.full_name);
    updateAccountUI();
    renderPortfolio();
    notify('Portfolio saved to your cloud account.');
  } catch (error) {
    notify(`Could not save portfolio: ${error.message}`, true);
  } finally {
    submitButton.disabled = false;
  }
});

$('#loadButton').addEventListener('click', () => loadPortfolio());
$('#generateButton').addEventListener('click', () => {
  const documentHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(form.elements.full_name.value.trim() || 'Portfolio')}</title><link rel="stylesheet" href="${new URL('style.css', window.location.href).href}"><style>body{min-height:100vh;padding:5vh 16px;background-color:#f4f2e9}.generated-output{width:min(900px,100%);min-height:590px;margin:0 auto;position:static;box-shadow:0 12px 45px rgb(0 0 0 / 12%)}@media(max-width:600px){body{padding:12px}.generated-output{min-height:460px}}</style></head><body><main class="portfolio-preview template-${selectedTemplate} generated-output">${preview.innerHTML}</main></body></html>`;
  const generatedUrl = URL.createObjectURL(new Blob([documentHtml], { type: 'text/html' }));
  window.open(generatedUrl, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(generatedUrl), 60000);
});
$('#deleteButton').addEventListener('click', async () => {
  if (!supabase || !currentUser || !savedPortfolioId || !window.confirm('Delete your saved portfolio? This cannot be undone.')) return;
  const { error } = await supabase.from('portfolios').delete().eq('user_id', currentUser.id);
  if (error) {
    notify(`Could not delete portfolio: ${error.message}`, true);
    return;
  }
  form.reset();
  form.dataset.photoUrl = '';
  selectedPhoto = null;
  savedPortfolioId = null;
  if (photoObjectUrl) URL.revokeObjectURL(photoObjectUrl);
  photoObjectUrl = '';
  chooseTemplate('simple');
  setPhotoPreview('', '');
  updateAccountUI();
  notify('Saved portfolio deleted.');
});

function openAuth(mode = 'login') {
  if (!supabase) {
    notify('Cloud saving is not configured yet. Add your Supabase URL and anon key in config.js.', true);
    return;
  }
  setAuthMode(mode);
  authModal.hidden = false;
  $('#authEmail').focus();
}

function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === 'signup';
  $('#signupFields').disabled = !signup;
  $('#signupFields').hidden = !signup;
  $('#confirmPasswordField').hidden = !signup;
  $('#authTitle').textContent = signup ? 'Create your account' : 'Welcome back';
  $('#authCopy').textContent = signup ? 'Create an account to save your portfolio securely in the cloud.' : 'Log in to save and manage your portfolio in the cloud.';
  $('#authSubmit').textContent = signup ? 'Create account' : 'Log in';
  $('#authSwitchText').textContent = signup ? 'Already have an account?' : 'New to Portech?';
  $('#authSwitch').textContent = signup ? 'Log in' : 'Create an account';
  $('#authPassword').autocomplete = signup ? 'new-password' : 'current-password';
}

$('#accountButton').addEventListener('click', () => currentUser ? loadPortfolio() : openAuth());
$('#signupButton').addEventListener('click', () => openAuth('signup'));
$('#logoutButton').addEventListener('click', async () => {
  const { error } = await supabase.auth.signOut();
  if (error) notify(error.message, true);
});
$('#closeAuth').addEventListener('click', () => { authModal.hidden = true; });
$('#authSwitch').addEventListener('click', () => setAuthMode(authMode === 'login' ? 'signup' : 'login'));
authModal.addEventListener('click', (event) => { if (event.target === authModal) authModal.hidden = true; });
window.addEventListener('keydown', (event) => { if (event.key === 'Escape') authModal.hidden = true; });

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = $('#authEmail').value.trim();
  const password = $('#authPassword').value;
  const signupFullName = $('#signupFullName').value.trim();
  const signupUsername = $('#signupUsername').value.trim();
  if (authMode === 'signup' && password !== $('#confirmPassword').value) {
    notify('Passwords do not match.', true);
    return;
  }
  $('#authSubmit').disabled = true;
  try {
    const result = authMode === 'signup'
      ? await supabase.auth.signUp({ email, password, options: { data: { full_name: signupFullName, username: signupUsername } } })
      : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    if (authMode === 'signup' && !result.data.session) {
      authModal.hidden = true;
      authForm.reset();
      notify('Check your email to confirm your account, then log in.');
      setAuthMode('login');
      return;
    }
    authModal.hidden = true;
    authForm.reset();
    notify(authMode === 'signup' ? 'Account created.' : 'You are logged in.');
  } catch (error) {
    notify(error.message, true);
  } finally {
    $('#authSubmit').disabled = false;
  }
});

async function start() {
  renderPortfolio();
  updateAccountUI();
  if (!supabaseUrl.startsWith('https://') || !supabaseAnonKey || supabaseAnonKey.includes('YOUR_')) {
    setConnection('Supabase setup needed');
    return;
  }
  setConnection('Connecting to cloud database');
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    const { error: databaseError } = await supabase.from('portfolios').select('id').limit(1);
    if (databaseError) throw databaseError;
    currentUser = session?.user || null;
    setConnection('Cloud database ready', 'ready');
    updateAccountUI();
    supabase.auth.onAuthStateChange((_event, nextSession) => {
      currentUser = nextSession?.user || null;
      updateAccountUI();
      if (currentUser) void loadPortfolio(false);
      else {
        savedPortfolioId = null;
        updateAccountUI();
      }
    });
    if (currentUser) await loadPortfolio(false);
  } catch (error) {
    setConnection('Cloud connection failed', 'error');
    notify(`Supabase could not start: ${error.message}`, true);
  }
}

if (window.lucide) window.lucide.createIcons();
void start();
