// utils/generateSlug.js
const slugify = require('slugify');

/**
 * generateSlug
 * @param {string} name - source string (product name)
 * @param {Object} [Model] - optional Mongoose model to check uniqueness
 * @param {string} [field='slug'] - field name in the model to check uniqueness
 * @returns {Promise<string>} slug
 *
 * If Model not provided, returns slugified name.
 */
const generateSlug = async (name, Model = null, field = 'slug') => {
  if (!name || typeof name !== 'string') {
    throw new Error('generateSlug: name must be a non-empty string');
  }

  // slugify options: lower-case, trim, remove non-URL-friendly chars
  const base = slugify(name, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g,
  }).slice(0, 120); // limit length

  if (!Model) return base;

  // check DB for uniqueness and append counter if needed
  let slug = base;
  let counter = 0;

  // defensive loop with limit to avoid infinite loops
  while (counter < 1000) {
    // build query: { [field]: slug }
    const existing = await Model.findOne({ [field]: slug }).lean().select('_id').exec();
    if (!existing) return slug;
    counter += 1;
    slug = `${base}-${counter}`;
  }

  // fallback: append timestamp
  return `${base}-${Date.now()}`;
};

module.exports = generateSlug;
