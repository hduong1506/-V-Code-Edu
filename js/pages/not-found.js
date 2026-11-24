// V-Code Edu — 404.
import { h, mount } from '../core/dom.js';
import { icon } from '../components/icons.js';

export default {
  title: 'Không tìm thấy trang',
  mount(container) {
    mount(container, h('div', { class: 'container page' }, h('div', { class: 'empty-state', style: 'padding-block:80px' },
      h('div', { class: 'empty-state__icon' }, icon('compass')),
      h('h1', { class: 'page-title' }, 'Không tìm thấy trang này'),
      h('p', null, 'Liên kết có thể đã cũ hoặc bị gõ nhầm. Hãy quay về trang chủ hoặc chọn một mục trong thanh điều hướng.'),
      h('div', { class: 'cluster', style: 'justify-content:center' },
        h('a', { class: 'btn btn--primary', href: '#/' }, icon('home'), 'Về trang chủ'),
        h('a', { class: 'btn', href: '#/learn' }, icon('book-open'), 'Xem khóa học')))));
  },
};
