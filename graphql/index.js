const { makeExecutableSchema } = require('@graphql-tools/schema');
const { GraphQLError, GraphQLScalarType, Kind } = require('graphql');
const jwt = require('jsonwebtoken');

const Category = require('../models/categoryModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const Wishlist = require('../models/wishlistModel');

const DateTime = new GraphQLScalarType({
  name: 'DateTime',
  serialize(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  },
  parseValue(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) return null;
    const date = new Date(ast.value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  },
});

function extractAuthToken(req) {
  const header = req.headers?.authorization || '';
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }
  const cookieToken = req.cookies?.accessToken;
  if (typeof cookieToken === 'string' && cookieToken.trim()) return cookieToken.trim();
  return null;
}

async function resolveUserFromRequest(req) {
  const token = extractAuthToken(req);
  if (!token) return null;
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
  const userId = decoded?.sub || decoded?.id;
  if (!userId) return null;
  const user = await User.findById(userId).select('-password');
  return user || null;
}

function requireAuth(context) {
  if (context?.user) return context.user;
  throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
}

function createIdLoader(Model, { select, populate } = {}) {
  const cache = new Map();
  return async (id) => {
    if (!id) return null;
    const key = String(id);
    if (cache.has(key)) return cache.get(key);
    let q = Model.findById(key);
    if (select) q = q.select(select);
    if (populate) q = q.populate(populate);
    const doc = await q;
    cache.set(key, doc || null);
    return doc || null;
  };
}

async function buildContext(req, res) {
  const user = await resolveUserFromRequest(req);
  return {
    req,
    res,
    requestId: req.id || null,
    user,
    loaders: {
      userById: createIdLoader(User, { select: '-password' }),
      categoryById: createIdLoader(Category),
      productById: createIdLoader(Product),
      wishlistByUserId: async (userId) => Wishlist.findOne({ user: userId }),
    },
  };
}

const typeDefs = /* GraphQL */ `
  scalar DateTime

  type Health {
    status: String!
    env: String!
    timestamp: DateTime!
    requestId: String
  }

  type PageMeta {
    total: Int!
    page: Int!
    limit: Int!
    totalPages: Int!
    hasNextPage: Boolean!
    hasPrevPage: Boolean!
  }

  type Image {
    url: String!
    public_id: String!
  }

  type EnvironmentImpact {
    savedCo2Kg: Float
    avoidedWasteKg: Float
    harmNewKg: Float
    harmAvoidedKg: Float
  }

  type Category {
    id: ID!
    name: String
    slug: String
    createdAt: DateTime
    updatedAt: DateTime
  }

  type UserSettingsNotifications {
    newMessage: Boolean
    productSold: Boolean
    priceDrop: Boolean
    newOffer: Boolean
    appUpdates: Boolean
  }

  type UserSettingsPrivacy {
    profileVisible: Boolean
    activityStatus: Boolean
    searchEngineListing: Boolean
    dataDownload: Boolean
    personalizedAds: Boolean
  }

  type UserSettingsPreferences {
    darkMode: Boolean
    compactView: Boolean
    autoPlayVideos: Boolean
    language: String
  }

  type UserSettingsSelling {
    autoRenewListings: Boolean
    enableOfferRequests: Boolean
    promoteListings: Boolean
    driverRegistered: Boolean
    driverApproved: Boolean
  }

  type UserSettingsSecurity {
    twoFactorEnabled: Boolean
  }

  type UserSettings {
    notifications: UserSettingsNotifications
    privacy: UserSettingsPrivacy
    preferences: UserSettingsPreferences
    selling: UserSettingsSelling
    security: UserSettingsSecurity
  }

  type User {
    id: ID!
    name: String
    email: String
    avatar: String
    phone: String
    username: String
    bio: String
    institution: String
    location: String
    isVerified: Boolean
    role: String
    profileViews: Int
    unreadMessages: Int
    totalSales: Int
    settings: UserSettings
    createdAt: DateTime
    updatedAt: DateTime
  }

  type ProductReview {
    user: User
    rating: Int
    comment: String
    date: DateTime
  }

  type Product {
    id: ID!
    title: String
    description: String
    price: Float
    category: Category
    type: String
    rentalPrice: Float
    rentalPeriod: String
    minRentalDuration: Int
    securityDeposit: Float
    buyBackAvailable: Boolean
    buyBackPrice: Float
    condition: String
    images: [Image!]
    seller: User
    location: String
    isSold: Boolean
    soldAt: DateTime
    views: Int
    rating: Float
    reviewCount: Int
    environment: EnvironmentImpact
    reviews: [ProductReview!]
    createdAt: DateTime
    updatedAt: DateTime
  }

  type ProductConnection {
    meta: PageMeta!
    data: [Product!]!
  }

  type Wishlist {
    id: ID!
    user: User!
    products: [Product!]!
    createdAt: DateTime
    updatedAt: DateTime
  }

  type Query {
    health: Health!
    me: User
    user(id: ID!): User
    categories: [Category!]!
    product(id: ID!): Product
    products(
      page: Int = 1
      limit: Int = 20
      q: String
      categoryId: ID
      sellerId: ID
      type: String
      isSold: Boolean
    ): ProductConnection!
    myWishlist: Wishlist
  }

  type Mutation {
    addToWishlist(productId: ID!): Wishlist!
    removeFromWishlist(productId: ID!): Wishlist!
  }
`;

function toPageMeta({ total, page, limit }) {
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
  const safePage = Math.max(1, Number(page) || 1);
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  return {
    total,
    page: safePage,
    limit: safeLimit,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
  };
}

const resolvers = {
  DateTime,
  Query: {
    health: (_parent, _args, context) => ({
      status: 'ok',
      env: process.env.NODE_ENV || 'development',
      timestamp: new Date(),
      requestId: context?.requestId || null,
    }),
    me: (_parent, _args, context) => context.user,
    user: async (_parent, { id }, context) => context.loaders.userById(id),
    categories: async () => Category.find({}).sort({ createdAt: -1 }),
    product: async (_parent, { id }) =>
      Product.findById(id).populate('category').populate({ path: 'seller', select: '-password' }),
    products: async (_parent, args) => {
      const page = Math.max(1, Number(args.page) || 1);
      const limit = Math.max(1, Math.min(100, Number(args.limit) || 20));
      const skip = (page - 1) * limit;

      const filter = {};
      if (args.categoryId) filter.category = args.categoryId;
      if (args.sellerId) filter.seller = args.sellerId;
      if (typeof args.isSold === 'boolean') filter.isSold = args.isSold;
      if (args.type && ['sell', 'rent'].includes(String(args.type))) filter.type = String(args.type);
      if (args.q && String(args.q).trim()) {
        const q = String(args.q).trim();
        filter.$or = [{ title: { $regex: q, $options: 'i' } }, { description: { $regex: q, $options: 'i' } }];
      }

      const [total, docs] = await Promise.all([
        Product.countDocuments(filter),
        Product.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('category')
          .populate({ path: 'seller', select: '-password' }),
      ]);

      return { meta: toPageMeta({ total, page, limit }), data: docs };
    },
    myWishlist: async (_parent, _args, context) => {
      const user = requireAuth(context);
      return Wishlist.findOne({ user: user._id })
        .populate({ path: 'user', select: '-password' })
        .populate('products')
        .populate({ path: 'products', populate: { path: 'category' } })
        .populate({ path: 'products', populate: { path: 'seller', select: '-password' } });
    },
  },
  Mutation: {
    addToWishlist: async (_parent, { productId }, context) => {
      const user = requireAuth(context);
      const product = await Product.findById(productId);
      if (!product) throw new GraphQLError('Product not found', { extensions: { code: 'NOT_FOUND' } });

      let wishlist = await Wishlist.findOne({ user: user._id });
      if (!wishlist) wishlist = new Wishlist({ user: user._id, products: [] });
      const already = wishlist.products.some((p) => String(p) === String(productId));
      if (already) throw new GraphQLError('Product already in wishlist', { extensions: { code: 'BAD_USER_INPUT' } });
      wishlist.products.push(productId);
      await wishlist.save();

      return Wishlist.findById(wishlist._id)
        .populate({ path: 'user', select: '-password' })
        .populate('products')
        .populate({ path: 'products', populate: { path: 'category' } })
        .populate({ path: 'products', populate: { path: 'seller', select: '-password' } });
    },
    removeFromWishlist: async (_parent, { productId }, context) => {
      const user = requireAuth(context);
      const wishlist = await Wishlist.findOne({ user: user._id });
      if (!wishlist) throw new GraphQLError('Wishlist not found', { extensions: { code: 'NOT_FOUND' } });

      wishlist.products = wishlist.products.filter((p) => String(p) !== String(productId));
      await wishlist.save();

      return Wishlist.findById(wishlist._id)
        .populate({ path: 'user', select: '-password' })
        .populate('products')
        .populate({ path: 'products', populate: { path: 'category' } })
        .populate({ path: 'products', populate: { path: 'seller', select: '-password' } });
    },
  },
  Category: {
    id: (c) => (c?.id ? String(c.id) : String(c?._id)),
  },
  User: {
    id: (u) => (u?.id ? String(u.id) : String(u?._id)),
  },
  Product: {
    id: (p) => (p?.id ? String(p.id) : String(p?._id)),
    seller: async (p, _args, context) => {
      if (!p?.seller) return null;
      if (typeof p.seller === 'object') return p.seller;
      return context.loaders.userById(p.seller);
    },
    category: async (p, _args, context) => {
      if (!p?.category) return null;
      if (typeof p.category === 'object') return p.category;
      return context.loaders.categoryById(p.category);
    },
    reviews: async (p, _args, context) => {
      const list = Array.isArray(p?.reviews) ? p.reviews : [];
      return Promise.all(
        list.map(async (r) => ({
          ...r,
          user: r.user ? await context.loaders.userById(r.user) : null,
        })),
      );
    },
  },
  Wishlist: {
    id: (w) => (w?.id ? String(w.id) : String(w?._id)),
    user: async (w, _args, context) => {
      if (typeof w.user === 'object') return w.user;
      return context.loaders.userById(w.user);
    },
    products: async (w, _args, context) => {
      if (Array.isArray(w.products) && w.products.length && typeof w.products[0] === 'object') return w.products;
      const ids = Array.isArray(w.products) ? w.products : [];
      const docs = await Promise.all(ids.map((id) => context.loaders.productById(id)));
      return docs.filter(Boolean);
    },
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

function formatGraphQLError(err) {
  const isProd = (process.env.NODE_ENV || 'development') === 'production';
  const base = {
    message: err?.message || 'GraphQL Error',
    path: err?.path,
    extensions: err?.extensions,
  };
  if (!isProd) base.locations = err?.locations;
  return base;
}

module.exports = {
  schema,
  buildContext,
  formatGraphQLError,
};

