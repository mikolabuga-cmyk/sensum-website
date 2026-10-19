const navigation = document.querySelector('#primary-nav');
const toggle = document.querySelector('.menu-toggle');
const menus = [...navigation.querySelectorAll('details')];
const mobile = window.matchMedia('(max-width: 760px)');

function closePanels() {
  menus.forEach(menu => { menu.open = false; });
}

function setNavigation(open) {
  navigation.hidden = mobile.matches && !open;
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  if (!open) closePanels();
}

function syncNavigation() {
  toggle.hidden = !mobile.matches;
  setNavigation(false);
}

toggle.addEventListener('click', () => {
  setNavigation(toggle.getAttribute('aria-expanded') !== 'true');
});

document.addEventListener('click', event => {
  if (!navigation.contains(event.target) && !toggle.contains(event.target)) {
    if (mobile.matches) setNavigation(false);
    else closePanels();
  }
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const openPanel = menus.find(menu => menu.open);
  if (openPanel) {
    openPanel.open = false;
    openPanel.querySelector('summary').focus();
  } else if (mobile.matches && toggle.getAttribute('aria-expanded') === 'true') {
    setNavigation(false);
    toggle.focus();
  }
});

mobile.addEventListener('change', syncNavigation);
syncNavigation();
