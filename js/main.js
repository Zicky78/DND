//Uncheck Radio Buttons
let lastChecked = null;

document.querySelectorAll('input[type="radio"]').forEach((radio) => {
	radio.addEventListener('click', function () {
		if (lastChecked === this) {
			this.checked = false; // uncheck it
			lastChecked = null; // reset
		} else {
			lastChecked = this; // remember this one
		}
	});
});

(function () {
	// Initialize all contenteditable fields under a root (default: document)
	function initEditables(root = document) {
		const boxes = root.querySelectorAll('[contenteditable][data-key]');
		boxes.forEach((box) => {
			const scope = findScope(box); // e.g., "Faradrax" or "default"
			const key = storageKey(scope, box.dataset.key);

			// Load saved content
			const saved = localStorage.getItem(key);
			if (saved !== null) box.innerHTML = saved;

			// Save on input (debounced to reduce writes)
			let t;
			box.addEventListener('input', () => {
				clearTimeout(t);
				t = setTimeout(() => localStorage.setItem(key, box.innerHTML), 150);
			});

			// Also save on blur to be safe
			box.addEventListener('blur', () => {
				localStorage.setItem(key, box.innerHTML);
			});
		});
	}

	function storageKey(scope, fieldKey) {
		return `sheet:${scope}:${fieldKey}`;
	}

	// Walk up the DOM to find the nearest data-scope; fallback to "default"
	function findScope(el) {
		const scoped = el.closest('[data-scope]');
		return (scoped && scoped.getAttribute('data-scope')) || 'default';
	}

	// Expose helpers if you want to switch characters dynamically:
	window.DnDEditable = {
		init: initEditables,
		loadScope(scope, root = document) {
			root.querySelectorAll('[contenteditable][data-key]').forEach((box) => {
				const key = storageKey(scope, box.dataset.key);
				const val = localStorage.getItem(key);
				box.innerHTML = val ?? '';
			});
		},
		clearScope(scope) {
			Object.keys(localStorage).forEach((k) => {
				if (k.startsWith(`sheet:${scope}:`)) localStorage.removeItem(k);
			});
		},
	};

	// Boot up for the whole page
	initEditables();
})();

function normalizeEmpty(el) {
	// Remove whitespace and non-breaking spaces
	const txt = el.textContent.replace(/\u00A0/g, ' ').trim();
	if (txt === '') {
		el.innerHTML = ''; // important: no <br>, no spaces
	}
}

document.addEventListener('input', (e) => {
	if (e.target.matches('.edit-desc[contenteditable]')) {
		normalizeEmpty(e.target);
	}
});

document.addEventListener(
	'blur',
	(e) => {
		if (e.target.matches('.edit-desc[contenteditable]')) {
			normalizeEmpty(e.target);
		}
	},
	true
);

// On load, normalize all boxes (handles content loaded from storage, etc.)
document
	.querySelectorAll('.edit-desc[contenteditable]')
	.forEach(normalizeEmpty);

document.querySelectorAll('.edit-desc[contenteditable]').forEach((el) => {
	el.addEventListener('paste', (e) => {
		e.preventDefault();
		const text = (e.clipboardData || window.clipboardData).getData(
			'text/plain'
		);
		document.execCommand('insertText', false, text); // simple cross-browser
	});
});

 document.querySelectorAll('[data-collapse-target]').forEach((btn) => {
		const id = btn.dataset.collapseTarget;
		const panel = document.getElementById(id);
		if (!panel) return;

		// Sync initial ARIA from data-open
		const startOpen = panel.dataset.open === 'true';
		btn.setAttribute('aria-expanded', String(startOpen));
		panel.setAttribute('aria-hidden', String(!startOpen));
		panel.toggleAttribute('inert', !startOpen);

		btn.addEventListener('click', () => {
			const isOpen = panel.dataset.open === 'true';
			panel.dataset.open = String(!isOpen);
			btn.setAttribute('aria-expanded', String(!isOpen));
			panel.setAttribute('aria-hidden', String(isOpen));
			panel.toggleAttribute('inert', isOpen); // prevent focus when closed
		});
 });



(function () {
	const list = document.getElementById('spells_container');
	const addBtn = document.getElementById('add-spell');

	if (!list || !addBtn) return;

	// Scope-aware storage keys (uses nearest data-scope or "default")
	const scope =
		list.closest('[data-scope]')?.getAttribute('data-scope') || 'default';
	const COUNT_KEY = `sheet:${scope}:spells_count`;
	const sk = (k) => `sheet:${scope}:${k}`;

	// Save Prepared checkbox via event delegation
	list.addEventListener('change', (e) => {
		if (e.target.matches('.prepared')) {
			const card = e.target.closest('.spell');
			if (!card) return;
			const idx = card.dataset.index;
			localStorage.setItem(
				sk(`spell_prepared_${idx}`),
				e.target.checked ? '1' : '0'
			);
		}
	});

	// run once at boot
	let i = 1;
	list
		.querySelectorAll('.spell')
		.forEach((card) => (card.dataset.index ||= String(i++)));

	addBtn.addEventListener('click', () => {
		const card = addSpell(); // create + wire + load saved values
		// Persist new total count
		localStorage.setItem(
			COUNT_KEY,
			String(list.querySelectorAll('.spell').length)
		);
		// Optional: scroll to new card
		card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	});

	function nextSpellIndex() {
		let max = 0;
		list.querySelectorAll('.spell').forEach((card) => {
			const n = parseInt(card.dataset.index || '0', 10);
			if (Number.isFinite(n) && n > max) max = n;
		});
		return max + 1;
	}

	function addSpell() {
		// make sure the first card has an index once (startup code elsewhere is fine too)
		const first = list.querySelector('.spell');
		if (first && !first.dataset.index) first.dataset.index = '1';

		const newIndex = nextSpellIndex();

		// Clone & index
		// Use any existing card as a template (e.g., the first one)
		const template = first; // or keep your old 'last' if you want
		const clone = template.cloneNode(true);
		clone.dataset.index = String(newIndex);

		// Update keys & clear
		clone.querySelectorAll('[data-key]').forEach((el) => {
			el.dataset.key = el.dataset.key.replace(/_\d+$/, `_${newIndex}`);
			if (el.getAttribute('contenteditable') === 'true') {
				el.innerHTML = '';
				el.removeAttribute('style');
			}
		});

		// Update collapse IDs/attrs
		const panel = clone.querySelector('[id^="spell-sec-"]');
		const btn = clone.querySelector('[data-collapse-target]');
		if (panel && btn) {
			panel.id = `spell-sec-${newIndex}`;
			panel.dataset.open = 'false';
			panel.setAttribute('aria-hidden', 'true');
			panel.setAttribute('inert', '');
			btn.setAttribute('data-collapse-target', panel.id);
			btn.setAttribute('aria-controls', panel.id);
			btn.setAttribute('aria-expanded', 'false');
		}

		// Reset checkboxes
		clone
			.querySelectorAll('input[type="checkbox"]')
			.forEach((cb) => (cb.checked = false));

		// Place into correct folder + sort
		placeInGroup(clone);

		// Wire collapse
		if (btn && panel)
			wireCollapse(clone.querySelector('[data-collapse-target]'), panel);

		// Auto-save hookup + restore prepared for this new index
		if (window.DnDEditable?.init) window.DnDEditable.init(clone);
		const prepared = clone.querySelector('.prepared');
		if (prepared) {
			prepared.checked =
				localStorage.getItem(sk(`spell_prepared_${newIndex}`)) === '1';
		}

		return clone;
	}

	// ---- Spell grouping + sorting helpers ----
	function getSpellName(card) {
		const el = card?.querySelector('[data-key^="spell_name_"]');
		return (el?.textContent || '').trim();
	}
	function parseSpellLevel(card) {
		const el = card?.querySelector('[data-key^="spell_level_"]');
		const raw = (el?.textContent || '').trim().toLowerCase();
		if (raw === 'cantrip' || raw === 'cantrips' || raw === '0') return 0;
		const n = parseInt(raw, 10);
		return Number.isFinite(n) ? Math.max(0, Math.min(9, n)) : 0;
	}
	function groupBody(level) {
		return document.querySelector(
			`#spells_container .spell-group[data-level="${level}"] .group-body`
		);
	}
	function sortGroup(level) {
		const body = groupBody(level);
		if (!body) return;
		const cards = Array.from(body.children);
		cards.sort((a, b) =>
			getSpellName(a)
				.toLowerCase()
				.localeCompare(getSpellName(b).toLowerCase(), undefined, {
					sensitivity: 'base',
				})
		);
		cards.forEach((c) => body.appendChild(c));
	}
	function placeInGroup(card) {
		if (!card) return;
		const lvl = parseSpellLevel(card);
		const body = groupBody(lvl);
		if (!body) return;
		body.appendChild(card);
		sortGroup(lvl);
	}

	// expose grouping helpers for other modules/IIFEs
	window.SPELLS = { placeInGroup, sortGroup, parseSpellLevel };

	function wireCollapse(button, panel) {
		if (!button || !panel) return;
		// remove copied listeners
		const fresh = button.cloneNode(true);
		button.replaceWith(fresh);
		fresh.addEventListener('click', () => {
			const isOpen = panel.dataset.open === 'true';
			panel.dataset.open = String(!isOpen);
			panel.setAttribute('aria-hidden', String(isOpen));
			panel.toggleAttribute('inert', isOpen);
			fresh.setAttribute('aria-expanded', String(!isOpen));
		});
	}

	// ---------- Rebuild on load ----------
	// How many spells should exist?
	const target = Math.max(
		1,
		parseInt(localStorage.getItem(COUNT_KEY) || '1', 10)
	);
	// Ensure the first card has data-index="1"
	const first = list.querySelector('.spell');
	if (first && !first.dataset.index) first.dataset.index = '1';

	// Add missing cards up to target
	for (let i = list.querySelectorAll('.spell').length + 1; i <= target; i++) {
		addSpell();
	}

	// Restore Prepared for existing cards (index 1 included)
	list.querySelectorAll('.spell').forEach((card) => {
		const idx = card.dataset.index;
		const cb = card.querySelector('.prepared');
		if (cb)
			cb.checked = localStorage.getItem(sk(`spell_prepared_${idx}`)) === '1';
	});

	// After restoring prepared checkboxes...
	list.querySelectorAll('.spell').forEach(placeInGroup);

	const RESORT_DELAY = 4000;
	const timers = new WeakMap();

	if (!list.dataset.sortDebounced) {
		list.dataset.sortDebounced = '1';
		list.addEventListener('input', (e) => {
			const t = e.target;
			if (!(t instanceof HTMLElement)) return;
			if (
				!t.matches(
					'[contenteditable][data-key^="spell_level_"], [contenteditable][data-key^="spell_name_"]'
				)
			)
				return;

			clearTimeout(timers.get(t));
			const card = t.closest('.spell');
			if (!card) return;

			const fn = t.dataset.key.startsWith('spell_level_')
				? () => placeInGroup(card)
				: () => sortGroup(parseSpellLevel(card));

			timers.set(t, setTimeout(fn, RESORT_DELAY));
		});
	}

	if (!list.dataset.sortOnBlur) {
		list.dataset.sortOnBlur = '1';
		list.addEventListener(
			'blur',
			(e) => {
				const t = e.target;
				if (!(t instanceof HTMLElement)) return;

				if (t.matches('[contenteditable][data-key^="spell_level_"]')) {
					const card = t.closest('.spell');
					if (card) placeInGroup(card); // move to new level + sort
				}
				if (t.matches('[contenteditable][data-key^="spell_name_"]')) {
					const card = t.closest('.spell');
					if (card) sortGroup(parseSpellLevel(card)); // re-sort within level
				}
			},
			true
		); // capture, because blur doesn't bubble
	}

	// Make sure the count key is correct (e.g., on first run)
	localStorage.setItem(
		COUNT_KEY,
		String(list.querySelectorAll('.spell').length)
	);
})();

(() => {
	const list = document.getElementById('spells_container');
	const first = list.querySelector('.spell');
	if (first && !first.dataset.index) first.dataset.index = '1';
	const addButton = document.getElementById('add-spell');
	const btnExport = document.getElementById('export-json');
	const btnImport = document.getElementById('import-json');
	const fileInput = document.getElementById('file-json');

	if (!list || !addButton || !btnExport || !btnImport || !fileInput) return;

	// Optional per-character namespace
	const scope =
		list.closest('[data-scope]')?.getAttribute('data-scope') || 'default';
	const { placeInGroup, sortGroup, parseSpellLevel } = window.SPELLS || {};
	const COUNT_KEY = `sheet:${scope}:spells_count`;
	const sk = (k) => `sheet:${scope}:${k}`;

	btnExport.addEventListener('click', () => {
		const payload = snapshot();
		const blob = new Blob([JSON.stringify(payload, null, 2)], {
			type: 'application/json',
		});
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `sheet-${scope}.json`;
		a.click();
		setTimeout(() => URL.revokeObjectURL(a.href), 1000);
	});

	btnImport.addEventListener('click', () => fileInput.click());
	fileInput.addEventListener('change', async (e) => {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			const text = await file.text();
			const data = JSON.parse(text);
			await restore(data);
			// also write to localStorage so refresh keeps it
			persistToLocalStorage(data);
		} catch (err) {
			console.error('Import failed:', err);
			alert('Import failed: invalid file?');
		} finally {
			fileInput.value = '';
		}
	});

	function snapshot() {
		const values = {};
		// capture all editable fields
		document.querySelectorAll('[contenteditable][data-key]').forEach((el) => {
			values[el.dataset.key] = el.innerHTML;
		});
		// capture prepared checkboxes per .spell index
		const prepared = {};
		list.querySelectorAll('.spell').forEach((card) => {
			const idx = card.dataset.index;
			const cb = card.querySelector('.prepared');
			prepared[idx] = !!(cb && cb.checked);
		});
		const spellCount = list.querySelectorAll('.spell').length;
		return { version: 1, scope, spellCount, values, prepared };
	}

	async function restore(data) {
		if (!data || typeof data !== 'object') throw new Error('Bad data');

		// ensure we have exactly spellCount cards
		const target = Math.max(1, data.spellCount || 1);
		let current = list.querySelectorAll('.spell').length;

		// add missing
		for (let i = current + 1; i <= target; i++) addButton.click();

		// remove extras (from the end)
		while (current > target) {
			const last =
				list.querySelector('.spell:last-of-type') ||
				list.querySelectorAll('.spell')[current - 1];
			if (!last) break;
			last.remove();
			current--;
		}

		// fill text fields by matching data-key
		document.querySelectorAll('[contenteditable][data-key]').forEach((el) => {
			const key = el.dataset.key;
			if (key in (data.values || {})) {
				el.innerHTML = data.values[key] || '';
				// If you use your DnDEditable saver, update storage now too
				localStorage.setItem(sk(key), el.innerHTML);
			}
		});

		// restore prepared checkboxes
		list.querySelectorAll('.spell').forEach((card) => {
			const idx = card.dataset.index;
			const cb = card.querySelector('.prepared');
			if (cb && data.prepared) {
				cb.checked = !!data.prepared[idx];
				localStorage.setItem(
					sk(`spell_prepared_${idx}`),
					cb.checked ? '1' : '0'
				);
			}
		});

		// Move all existing cards into their folders and sort them
		list.querySelectorAll('.spell').forEach(placeInGroup);

		// Keep groups sorted when editing
		if (!list.dataset.sortListener) {
			list.dataset.sortListener = '1';
			list.addEventListener('input', (e) => {
				const target = e.target;
				if (!(target instanceof HTMLElement)) return;

				if (target.matches('[contenteditable][data-key^="spell_level_"]')) {
					const card = target.closest('.spell');
					placeInGroup(card); // move to new level + sort
				}
				if (target.matches('[contenteditable][data-key^="spell_name_"]')) {
					const card = target.closest('.spell');
					sortGroup(parseSpellLevel(card)); // resort by name
				}
			});
		}

		// update stored count
		localStorage.setItem(
			COUNT_KEY,
			String(list.querySelectorAll('.spell').length)
		);
	}

	function persistToLocalStorage(data) {
		// write everything to localStorage so a page refresh keeps it too
		localStorage.setItem(COUNT_KEY, String(data.spellCount || 1));
		if (data.values) {
			Object.entries(data.values).forEach(([k, v]) =>
				localStorage.setItem(sk(k), v ?? '')
			);
		}
		if (data.prepared) {
			Object.entries(data.prepared).forEach(([idx, val]) =>
				localStorage.setItem(sk(`spell_prepared_${idx}`), val ? '1' : '0')
			);
		}
	}
	// --- Native Save/Open (Chromium + HTTPS/localhost). Falls back elsewhere ---
	async function saveNative() {
		const data = snapshot(); // uses your existing snapshot()
		if ('showSaveFilePicker' in window) {
			const handle = await window.showSaveFilePicker({
				suggestedName: `sheet-${scope}.json`,
				types: [
					{ description: 'JSON', accept: { 'application/json': ['.json'] } },
				],
			});
			const w = await handle.createWritable();
			await w.write(JSON.stringify(data, null, 2));
			await w.close();
		} else {
			// Fallback: download as file
			const blob = new Blob([JSON.stringify(data, null, 2)], {
				type: 'application/json',
			});
			const a = document.createElement('a');
			a.href = URL.createObjectURL(blob);
			a.download = `sheet-${scope}.json`;
			a.click();
			setTimeout(() => URL.revokeObjectURL(a.href), 1000);
		}
	}

	async function openNative() {
		if ('showOpenFilePicker' in window) {
			const [handle] = await window.showOpenFilePicker({
				types: [
					{ description: 'JSON', accept: { 'application/json': ['.json'] } },
				],
			});
			const file = await handle.getFile();
			const data = JSON.parse(await file.text());
			await restore(data);
			persistToLocalStorage(data);
		} else {
			// Fallback: hidden input
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = 'application/json';
			input.onchange = async () => {
				const file = input.files?.[0];
				if (!file) return;
				const data = JSON.parse(await file.text());
				await restore(data);
				persistToLocalStorage(data);
			};
			input.click();
		}
	}

	// Expose to buttons (or call directly in onclick handlers)
	window.SheetFS = { saveNative, openNative };

	// Auto-load a default JSON if present (same-origin)
	// Put this near the end of the IIFE, before it closes.
	(async () => {
		// Priority: ?sheet= URL param > meta[name=sheet-json] > data-default-json
		const qs = new URLSearchParams(location.search).get('sheet');
		const fromMeta = document.querySelector('meta[name="sheet-json"]')?.content;
		const fromAttr =
			document.getElementById('spells_container')?.dataset.defaultJson;
		const url = qs || fromMeta || fromAttr;
		if (!url) return;

		try {
			const res = await fetch(url, { cache: 'no-store' });
			if (!res.ok) return; // no file -> just fall back to localStorage
			let data;
			const ct = res.headers.get('content-type') || '';
			if (ct.includes('application/json')) {
				data = await res.json();
			} else {
				// some hosts serve JSON as text/plain
				data = JSON.parse(await res.text());
			}
			await restore(data); // rebuild cards + fill values
			persistToLocalStorage(data); // so refresh works offline
			console.info('Loaded sheet from', url);
		} catch (err) {
			console.warn('Default sheet load failed:', err);
			// falls back to whatever localStorage had
		}
	})();
})();

document
	.getElementById('save-native')
	?.addEventListener('click', () => SheetFS.saveNative());
document
	.getElementById('open-native')
	?.addEventListener('click', () => SheetFS.openNative());

