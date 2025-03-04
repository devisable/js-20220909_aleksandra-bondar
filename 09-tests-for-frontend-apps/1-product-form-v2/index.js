import SortableList from '../2-sortable-list/index.js';
import escapeHtml from './utils/escape-html.js';
import fetchJson from './utils/fetch-json.js';

const IMGUR_CLIENT_ID = '28aaa2e823b03b1';
const BACKEND_URL = 'https://course-js.javascript.ru';

export default class ProductForm {

  element;
  subElements = {};
  subcategories = [];
  
  defaultFormData = {
    title: '',
    description: '',
    quantity: 1,
    price: 100,
    status: 1,
    subcategory: '',
    discount: 0,
    images: [],
  }
  
  constructor (productId) {
    this.productId = productId;
    this.url = new URL(`/api/rest/products`, BACKEND_URL);
    this.data = {};    
  }

  async render () {

    const categoriesPr = this.loadSubcategories();
    const productPr = this.productId ? this.loadData(this.productId) : Promise.resolve([this.defaultFormData]);

    const [subcategories, productResponse] = await Promise.all([categoriesPr, productPr]);

    this.subcategories = subcategories;
    this.data = productResponse[0];

    const wrapper = document.createElement('div');
    wrapper.innerHTML = this.getHTML();
    this.element = wrapper.firstElementChild;
    this.subElements = this.getSubElements();
    this.getSubcategories();
    this.getImages();

    this.addEventListeners();

    return this.element;

  }

  addEventListeners() {
    const {productForm, uploadImage} = this.subElements;

    productForm.addEventListener('submit', this.onSubmit);
    uploadImage.addEventListener('click', this.uploadImage);

  }

  uploadImage = () => {
    const inputFile = document.createElement('input');
    inputFile.type = 'file';
    inputFile.accept = 'image/*';

    inputFile.addEventListener('change', async () => {
      const [file] = inputFile.files;
      
      if (file) {
        const formData = new FormData();
        formData.append('image', file);

        const {uploadImage, imageListContainer} = this.subElements;

        uploadImage.classList.add('is-loading');
        uploadImage.disabled = true;

        const result = await fetchJson('https://api.imgur.com/3/image', {
          method: 'POST',
          headers: {
            Authorization: `Client-ID ${IMGUR_CLIENT_ID}`,
          },
          body: formData,
          referrer: ''
        });

        imageListContainer.append(this.getImageItem(result.data.link, file.name));

        uploadImage.classList.remove('is-loading');
        uploadImage.disabled = false;

        inputFile.remove();
      }
    });

    inputFile.hidden = true;
    document.body.append(inputFile);

    inputFile.click();
  };

  async loadData(id) {
    
    this.url.searchParams.set("id", id);    
    
    try {
      return await fetchJson(this.url);
    } catch(err) {
      throw new Error(err);
      };      

  }

  async loadSubcategories() {

    try {
      return await fetchJson(new URL('api/rest/categories?_sort=weight&_refs=subcategory', BACKEND_URL)); 
    } catch (err) {
      throw new Error(err.message);
    }  
    
  }

  getHTML() {
    return `<div class="product-form">
      <form data-element="productForm" class="form-grid">
        <div class="form-group form-group__half_left">
          <fieldset>
            <label class="form-label">Название товара</label>
            <input required="" type="text" name="title" id="title" class="form-control" placeholder="Название товара" value="${escapeHtml(this.data.title)}">
          </fieldset>
        </div>
        <div class="form-group form-group__wide">
          <label class="form-label">Описание</label>
          <textarea required="" class="form-control" name="description" id="description" data-element="productDescription" placeholder="Описание товара">${escapeHtml(this.data.description)}</textarea>
        </div>
        <div class="form-group form-group__wide" data-element="sortable-list-container">
          <label class="form-label">Фото</label>
          <div data-element="imageListContainer"><ul class="sortable-list">            
          </ul></div>            
          <button type="button" data-element="uploadImage" name="uploadImage" class="button-primary-outline"><span>Загрузить</span></button>
        </div>
        <div class="form-group form-group__half_left">
          <label class="form-label">Категория</label>
          <select class="form-control" id="subcategory" data-element="subcategory" name="subcategory" value=${escapeHtml(this.data.subcategory)}>
          </select>
        </div>
        <div class="form-group form-group__half_left form-group__two-col">
          <fieldset>
            <label class="form-label">Цена ($)</label>
            <input required="" type="number" name="price" id="price" class="form-control" placeholder="100" value=${this.data.price}>
          </fieldset>
          <fieldset>
            <label class="form-label">Скидка ($)</label>
            <input required="" type="number" name="discount" id="discount" class="form-control" placeholder="0" value=${this.data.discount}>
          </fieldset>
        </div>
        <div class="form-group form-group__part-half">
          <label class="form-label">Количество</label>
          <input required="" type="number" class="form-control" name="quantity" id="quantity" placeholder="1" value=${this.data.quantity}>
        </div>
        <div class="form-group form-group__part-half">
          <label class="form-label">Статус</label>
          <select class="form-control" name="status" id="status" value=${this.data.status}>
            <option value="1">Активен</option>
            <option value="0">Неактивен</option>
          </select>
        </div>
        <div class="form-buttons">
          <button type="submit" name="save" class="button-primary-outline">
          ${this.productId ? 'Сохранить' : 'Добавить'} товар
          </button>
        </div>
      </form>
    </div>`;
  }
  
  getSubcategories(){

    let i = 0;
    this.subcategories.map(category => {
      category.subcategories.map(item => {
        this.subElements.subcategory.options[i++] = new Option(`${category.title} > ${item.title}`, item.id);
      });
    });

  }

  getImages(){

    const imagesSortableList = new SortableList({
      items: this.data.images.map(image => {
        const wrapper = document.createElement("li");
        wrapper.innerHTML = `<li class="products-edit__imagelist-item sortable-list__item" style="">
          <input type="hidden" name="url" value="${escapeHtml(image.url)}">
          <input type="hidden" name="source" value="${escapeHtml(image.source)}">
          <span>
          <img src="icon-grab.svg" data-grab-handle="" alt="grab">
          <img class="sortable-table__cell-img" alt="Image" src="${escapeHtml(image.url)}">
          <span>${escapeHtml(image.source)}</span>
          </span>
        <button type="button">
          <img src="icon-trash.svg" data-delete-handle="" alt="delete">
        </button>
        </li>`;
        return wrapper.firstElementChild;
      }),
    });

    this.subElements.imageListContainer.append(imagesSortableList.element);
              
  }

  onSubmit = event => {
    event.preventDefault();
    this.save();
  }

  async save() {
    const product = this.getFormData();

    try {
      const result = await fetchJson(this.url, {
        method: this.productId ? 'PATCH' : 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(product)
      });

      this.dispatchEvent(result.id);
    } catch (err) {
      throw new Error(err.message);
    }
  }

  getFormData() {
    const {productForm, imageListContainer} = this.subElements;
    const excludedFields = ['images'];
    const formatToNumber = ['price', 'quantity', 'discount', 'status'];
    const fields = Object.keys(this.defaultFormData).filter(item => !excludedFields.includes(item));
    const values = {};

    for (const field of fields) {
      
      values[field] = formatToNumber.includes(field)
        ? parseInt(productForm[field])
        : productForm[field];
    }
  }

  dispatchEvent(id) {
    const event = this.productId
      ? new CustomEvent('product-updated', {detail: id})
      : new CustomEvent('product-saved');

    this.element.dispatchEvent(event);
  }

  getSubElements() {
    const result = {};
    const elements = this.element.querySelectorAll("[data-element]");

    for (const subElement of elements) {
      const name = subElement.dataset.element;
      result[name] = subElement;      
    }

    return result;
  }  

  remove() {
    if (this.element) {
      this.element.remove();
    }
  }

  destroy() {
    this.remove();
    this.element = null;
    this.subElements = {};
  }

}
