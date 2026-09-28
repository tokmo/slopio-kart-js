// Mini bus d'évènements : le gameplay émet, l'interface (toasts, commentateur) écoute.
const handlers = [];
export const onEvent = fn => handlers.push(fn);
export const emit = (type, kart, extra) => handlers.forEach(h => h(type, kart, extra));
