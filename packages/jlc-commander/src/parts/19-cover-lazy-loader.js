// @@creamu-part:19-cover-lazy-loader
    class CoverLazyLoader {
        constructor(options = {}) {
            this.callbackLoaded = typeof options.callback_loaded === 'function'
                ? options.callback_loaded
                : null;
            this.callbackError = typeof options.callback_error === 'function'
                ? options.callback_error
                : null;
            this.boundImages = new WeakSet();
        }

        collectImages(root) {
            const images = new Set();
            const collect = (node) => {
                if (!node) return;
                if (node.matches?.('img.lazy[data-src]')) images.add(node);
                node.querySelectorAll?.('img.lazy[data-src]').forEach(image => images.add(image));
            };

            if (!root) {
                collect(document);
            } else if (root.nodeType || root === document) {
                collect(root);
            } else if (typeof root.toArray === 'function') {
                root.toArray().forEach(collect);
            } else if (typeof root[Symbol.iterator] === 'function') {
                Array.from(root).forEach(collect);
            }
            return Array.from(images);
        }

        bindImage(image) {
            if (!image || this.boundImages.has(image)) return false;
            const source = image.getAttribute('data-src');
            if (!source) return false;

            this.boundImages.add(image);
            image.setAttribute('loading', 'lazy');
            image.setAttribute('decoding', 'async');
            image.classList.add('loading');

            let settled = false;
            const cleanup = () => {
                image.removeEventListener('load', onLoad);
                image.removeEventListener('error', onError);
            };
            const finish = (loaded) => {
                if (settled) return;
                settled = true;
                cleanup();
                image.classList.remove('loading');
                image.classList.toggle('loaded', loaded);
                image.classList.toggle('error', !loaded);
                if (loaded) this.callbackLoaded?.(image);
                else this.callbackError?.(image);
            };
            const onLoad = () => finish(true);
            const onError = () => finish(false);

            image.addEventListener('load', onLoad);
            image.addEventListener('error', onError);
            const sourceSet = image.getAttribute('data-srcset');
            const sizes = image.getAttribute('data-sizes');
            if (sourceSet) image.setAttribute('srcset', sourceSet);
            if (sizes) image.setAttribute('sizes', sizes);
            image.setAttribute('src', source);

            if (image.complete) {
                queueMicrotask(() => finish(Number(image.naturalWidth || 0) > 0));
            }
            return true;
        }

        update(root = null) {
            return this.collectImages(root).reduce(
                (count, image) => count + (this.bindImage(image) ? 1 : 0),
                0
            );
        }
    }
