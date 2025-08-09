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
