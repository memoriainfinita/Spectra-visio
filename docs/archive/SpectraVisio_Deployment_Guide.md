# SpectraVisio - Deployment Guide

**Versión:** 1.0  
**Fecha:** Enero 6, 2026  
**Autor:** [Tu Nombre]  
**Estado:** Draft

---

## 📖 Propósito del Documento

Guía completa para **deployment y distribución** de SpectraVisio:
- 🏗️ **Build Process** - Configuración de build optimizado
- 🌐 **Deployment Options** - GitHub Pages, Netlify, Vercel, CDN
- ⚡ **Performance** - Optimizaciones para producción
- 📱 **Mobile** - Consideraciones específicas
- 🔧 **CI/CD** - Automatización completa

---

## 🏗️ BUILD CONFIGURATION

### 1. Webpack Configuration

**webpack.prod.js:**
```javascript
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  mode: 'production',
  
  entry: {
    main: './src/index.js',
    // Plugin chunks para lazy loading
    plugins: './src/plugins/index.js'
  },
  
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash:8].js',
    chunkFilename: '[name].[contenthash:8].chunk.js',
    publicPath: './',
    clean: true
  },
  
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true, // Remove console.logs
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info']
          },
          mangle: {
            safari10: true // iOS Safari compatibility
          }
        }
      })
    ],
    
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Core framework
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        },
        
        // Individual plugins
        plugins: {
          test: /[\\/]src[\\/]plugins[\\/]/,
          name: 'plugins',
          chunks: 'async',
          minSize: 0
        },
        
        // Audio processing
        audio: {
          test: /[\\/]src[\\/]audio[\\/]/,
          name: 'audio',
          chunks: 'all'
        }
      }
    },
    
    // Runtime chunk para better caching
    runtimeChunk: 'single'
  },
  
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: {
                  browsers: ['> 1%', 'last 2 versions', 'not ie <= 11']
                },
                modules: false,
                useBuiltIns: 'usage',
                corejs: 3
              }]
            ]
          }
        }
      },
      
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  ['autoprefixer'],
                  ['cssnano', { preset: 'default' }]
                ]
              }
            }
          }
        ]
      },
      
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024 // 8kb
          }
        }
      },
      
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource'
      }
    ]
  },
  
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true
      }
    }),
    
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash:8].css',
      chunkFilename: '[name].[contenthash:8].chunk.css'
    }),
    
    // Gzip compression
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8
    }),
    
    // Bundle analysis (opcional)
    process.env.ANALYZE && new BundleAnalyzerPlugin()
  ].filter(Boolean),
  
  performance: {
    hints: 'warning',
    maxAssetSize: 250000,    // 250kb
    maxEntrypointSize: 500000 // 500kb
  }
};
```

### 2. Package.json Scripts

```json
{
  "scripts": {
    "dev": "webpack serve --config webpack.dev.js --open",
    "build": "webpack --config webpack.prod.js",
    "build:analyze": "ANALYZE=true npm run build",
    "build:stats": "webpack --config webpack.prod.js --json > dist/webpack-stats.json",
    
    "test": "jest",
    "test:coverage": "jest --coverage",
    "test:e2e": "cypress run",
    
    "lint": "eslint src/ --ext .js",
    "lint:fix": "eslint src/ --ext .js --fix",
    
    "prebuild": "npm run test && npm run lint",
    "postbuild": "npm run build:gzip-check",
    
    "build:gzip-check": "node scripts/check-gzip-sizes.js",
    "deploy:gh-pages": "npm run build && gh-pages -d dist",
    "deploy:netlify": "npm run build && netlify deploy --prod --dir=dist",
    "deploy:vercel": "vercel --prod"
  }
}
```

### 3. Environment Configuration

**.env.production:**
```env
NODE_ENV=production
REACT_APP_VERSION=$npm_package_version
REACT_APP_BUILD_DATE=$BUILD_DATE
REACT_APP_GIT_COMMIT=$GIT_COMMIT

# Analytics
REACT_APP_GA_TRACKING_ID=G-XXXXXXXXXX
REACT_APP_HOTJAR_ID=XXXXXXX

# CDN URLs
REACT_APP_ASSET_CDN=https://cdn.spectravisio.dev
REACT_APP_PLUGIN_CDN=https://plugins.spectravisio.dev

# Performance
REACT_APP_ENABLE_SERVICE_WORKER=true
REACT_APP_ENABLE_PRELOAD=true
REACT_APP_LAZY_LOAD_PLUGINS=true
```

---

## 🌐 DEPLOYMENT OPTIONS

### 1. GitHub Pages (Gratis)

**gh-pages-deploy.yml:**
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v3
      
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run tests
      run: npm run test
      
    - name: Build
      run: npm run build
      env:
        CI: false
        BUILD_DATE: ${{ github.event.head_commit.timestamp }}
        GIT_COMMIT: ${{ github.sha }}
        
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      if: github.ref == 'refs/heads/main'
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
        cname: spectravisio.yourdomain.com # Opcional: custom domain
```

**Configuración GitHub Pages:**
```bash
# 1. Habilitar GitHub Pages en repo settings
# 2. Set source branch to 'gh-pages'
# 3. Optional: Custom domain

# Deploy manual
npm run build
npx gh-pages -d dist

# Deploy con custom domain
echo 'spectravisio.yourdomain.com' > dist/CNAME
```

### 2. Netlify (Optimizado para SPAs)

**netlify.toml:**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_ENV = "production"
  NETLIFY = "true"

# SPA redirect rules
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
  conditions = {Role = ["admin"]} # Optional: admin access only

# Headers for performance
[[headers]]
  for = "*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
    
[[headers]]
  for = "*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
    
[[headers]]
  for = "*.png"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
    
[[headers]]
  for = "/index.html"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

# Form handling para contact/feedback
[[forms]]
  name = "feedback"
  
# Functions para API endpoints (opcional)
[functions]
  directory = "netlify/functions"
```

**Deploy Scripts:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy preview
netlify deploy

# Deploy to production
netlify deploy --prod

# With custom domain
netlify sites:create --name spectravisio-awesome
```

### 3. Vercel (Edge Functions)

**vercel.json:**
```json
{
  "version": 2,
  "name": "spectravisio",
  "alias": ["spectravisio.vercel.app"],
  
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    }
  ],
  
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/static/(.*)",
      "dest": "/static/$1",
      "headers": {
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options", 
          "value": "nosniff"
        }
      ]
    }
  ],
  
  "functions": {
    "app/api/analytics.js": {
      "maxDuration": 10
    }
  }
}
```

### 4. Self-Hosted (VPS/Cloud)

**Docker Configuration:**
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy build files
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf:**
```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        application/javascript
        application/json
        text/css
        text/javascript
        text/xml
        text/plain;
        
    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;
        
        # SPA routing
        location / {
            try_files $uri $uri/ /index.html;
        }
        
        # Static assets with long cache
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, max-age=31536000, immutable";
        }
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header Referrer-Policy strict-origin-when-cross-origin;
        
        # Service Worker
        location /sw.js {
            expires 0;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
    }
}
```

**Docker Compose:**
```yaml
# docker-compose.yml
version: '3.8'

services:
  spectravisio:
    build: .
    ports:
      - "80:80"
    restart: unless-stopped
    
  # Optional: Redis para analytics
  redis:
    image: redis:alpine
    restart: unless-stopped
    
  # Optional: Analytics API
  analytics:
    build: ./api
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
```

---

## ⚡ PERFORMANCE OPTIMIZATIONS

### 1. Asset Optimization

**images-optimization.js:**
```javascript
// scripts/optimize-images.js
const sharp = require('sharp');
const glob = require('glob');
const path = require('path');

async function optimizeImages() {
  const images = glob.sync('src/assets/**/*.{png,jpg,jpeg}');
  
  for (const imagePath of images) {
    const outputPath = imagePath.replace('src/', 'dist/');
    const dir = path.dirname(outputPath);
    
    // Ensure directory exists
    await fs.promises.mkdir(dir, { recursive: true });
    
    // Optimize image
    await sharp(imagePath)
      .resize(800, 600, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality: 85, progressive: true })
      .png({ quality: 85, progressive: true })
      .toFile(outputPath);
      
    console.log(`Optimized: ${imagePath} -> ${outputPath}`);
  }
}

optimizeImages().catch(console.error);
```

### 2. Service Worker

**sw.js:**
```javascript
const CACHE_NAME = 'spectravisio-v1.0.0';
const STATIC_CACHE = 'spectravisio-static-v1.0.0';
const DYNAMIC_CACHE = 'spectravisio-dynamic-v1.0.0';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/static/js/main.js',
  '/static/css/main.css',
  '/static/media/logo.png'
];

// Install event - cache static files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_FILES))
      .then(() => self.skipWaiting())
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => 
              cacheName.startsWith('spectravisio-') && 
              cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE
            )
            .map(cacheName => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip external requests
  if (!request.url.startsWith(self.location.origin)) return;
  
  // API requests - network first
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then(cache => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }
  
  // Plugin files - cache first
  if (request.url.includes('/plugins/')) {
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) return response;
          
          return fetch(request)
            .then(networkResponse => {
              const responseClone = networkResponse.clone();
              caches.open(DYNAMIC_CACHE)
                .then(cache => cache.put(request, responseClone));
              return networkResponse;
            });
        })
    );
    return;
  }
  
  // Static files - cache first
  event.respondWith(
    caches.match(request)
      .then(response => response || fetch(request))
  );
});
```

### 3. Code Splitting Strategy

**lazy-loading.js:**
```javascript
// src/utils/lazy-loading.js
class LazyLoader {
  constructor() {
    this.loadedPlugins = new Set();
    this.loadingPromises = new Map();
  }

  async loadPlugin(pluginId) {
    // Evitar cargas duplicadas
    if (this.loadedPlugins.has(pluginId)) {
      return this.getLoadedPlugin(pluginId);
    }
    
    // Si ya está cargando, devolver la promise existente
    if (this.loadingPromises.has(pluginId)) {
      return this.loadingPromises.get(pluginId);
    }
    
    // Crear nueva promise de carga
    const loadPromise = this.performPluginLoad(pluginId);
    this.loadingPromises.set(pluginId, loadPromise);
    
    return loadPromise;
  }

  async performPluginLoad(pluginId) {
    try {
      // Dynamic import con error handling
      const module = await import(
        /* webpackChunkName: "[request]" */
        `../plugins/${pluginId}/index.js`
      );
      
      this.loadedPlugins.add(pluginId);
      this.loadingPromises.delete(pluginId);
      
      return module.default;
    } catch (error) {
      this.loadingPromises.delete(pluginId);
      throw new Error(`Failed to load plugin ${pluginId}: ${error.message}`);
    }
  }

  preloadPlugin(pluginId) {
    // Preload sin bloquear
    import(`../plugins/${pluginId}/index.js`)
      .then(() => this.loadedPlugins.add(pluginId))
      .catch(() => {}); // Silent fail para preloads
  }

  preloadCriticalPlugins() {
    // Precargar plugins más usados
    const criticalPlugins = ['tunnel', 'plasma', 'ribbons'];
    criticalPlugins.forEach(pluginId => {
      this.preloadPlugin(pluginId);
    });
  }
}

export default new LazyLoader();
```

---

## 📱 MOBILE OPTIMIZATIONS

### 1. Responsive Configuration

**mobile-config.js:**
```javascript
// src/config/mobile.js
export const MobileConfig = {
  // Performance targets for mobile
  performance: {
    targetFPS: 30, // Lower FPS target
    maxParticles: 100, // Reduced particle count
    enableGPUOptimizations: true,
    useLowQualityMode: true
  },
  
  // UI adjustments
  ui: {
    enableTouchControls: true,
    hideComplexControls: true,
    simplifiedParameterPanel: true,
    largerTouchTargets: true
  },
  
  // Audio processing
  audio: {
    reducedFFTSize: 1024, // Smaller FFT for performance
    lowerSampleRate: 22050,
    skipAnalysisFrames: 1 // Analyze every other frame
  },
  
  // Feature toggles
  features: {
    disableLayerSystem: true,
    disableComplexBlendModes: true,
    disableVideoRecording: true,
    enableBatteryMode: true
  }
};

// Detect mobile and apply config
export function applyMobileOptimizations() {
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
                   .test(navigator.userAgent);
                   
  if (isMobile) {
    // Apply mobile-specific webpack chunks
    const mobileChunk = import(
      /* webpackChunkName: "mobile-optimizations" */
      './mobile-optimizations.js'
    );
    
    return mobileChunk;
  }
  
  return Promise.resolve();
}
```

### 2. PWA Configuration

**manifest.json:**
```json
{
  "name": "SpectraVisio - Audio Visualizer",
  "short_name": "SpectraVisio",
  "description": "Professional audio visualizer and VJ tool",
  "version": "1.0.0",
  "display": "standalone",
  "orientation": "landscape-primary",
  "theme_color": "#6366f1",
  "background_color": "#000000",
  
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96", 
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  
  "screenshots": [
    {
      "src": "/screenshots/desktop-1.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    },
    {
      "src": "/screenshots/mobile-1.png", 
      "sizes": "320x640",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ],
  
  "categories": ["music", "entertainment", "audio", "visual"],
  "lang": "en",
  
  "start_url": "/?utm_source=pwa",
  "scope": "/",
  
  "shortcuts": [
    {
      "name": "Quick Start",
      "short_name": "Start",
      "url": "/?quick-start=true",
      "icons": [
        {
          "src": "/icons/shortcut-start.png",
          "sizes": "96x96"
        }
      ]
    }
  ]
}
```

---

## 🔧 CI/CD PIPELINE

### 1. GitHub Actions Complete

**.github/workflows/ci-cd.yml:**
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  release:
    types: [published]

env:
  NODE_VERSION: '18'
  CACHE_DEPENDENCY_PATH: 'package-lock.json'

jobs:
  # Test job
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
        cache-dependency-path: ${{ env.CACHE_DEPENDENCY_PATH }}
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run linting
      run: npm run lint
      
    - name: Run unit tests
      run: npm run test:coverage
      
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        
  # E2E tests
  e2e:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js  
      uses: actions/setup-node@v3
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build app
      run: npm run build
      
    - name: Run Cypress tests
      uses: cypress-io/github-action@v5
      with:
        start: npm run serve
        wait-on: 'http://localhost:3000'
        browser: chrome
        
    - name: Upload screenshots
      uses: actions/upload-artifact@v3
      if: failure()
      with:
        name: cypress-screenshots
        path: cypress/screenshots/
        
  # Build and deploy staging
  deploy-staging:
    runs-on: ubuntu-latest
    needs: [test, e2e]
    if: github.ref == 'refs/heads/develop'
    
    environment:
      name: staging
      url: https://staging.spectravisio.dev
      
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
        
    - name: Install dependencies  
      run: npm ci
      
    - name: Build for staging
      run: npm run build
      env:
        NODE_ENV: staging
        REACT_APP_API_URL: https://api-staging.spectravisio.dev
        
    - name: Deploy to staging
      run: |
        npm install -g netlify-cli
        netlify deploy --dir=dist --site=${{ secrets.NETLIFY_STAGING_SITE_ID }}
      env:
        NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
        
  # Deploy production
  deploy-production:
    runs-on: ubuntu-latest
    needs: [test, e2e]
    if: github.ref == 'refs/heads/main'
    
    environment:
      name: production
      url: https://spectravisio.dev
      
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build for production
      run: npm run build
      env:
        NODE_ENV: production
        REACT_APP_API_URL: https://api.spectravisio.dev
        REACT_APP_GA_TRACKING_ID: ${{ secrets.GA_TRACKING_ID }}
        BUILD_DATE: ${{ github.event.head_commit.timestamp }}
        GIT_COMMIT: ${{ github.sha }}
        
    - name: Run post-build checks
      run: |
        npm run build:gzip-check
        npm run test:bundle-size
        
    - name: Deploy to production
      run: |
        npm install -g netlify-cli
        netlify deploy --prod --dir=dist --site=${{ secrets.NETLIFY_SITE_ID }}
      env:
        NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
        
    - name: Notify deployment success
      if: success()
      run: |
        curl -X POST -H 'Content-type: application/json' \
          --data '{"text":"🚀 SpectraVisio deployed to production successfully!"}' \
          ${{ secrets.SLACK_WEBHOOK_URL }}
          
  # Release job
  release:
    runs-on: ubuntu-latest
    needs: deploy-production
    if: github.event_name == 'release'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Create release package
      run: |
        mkdir release-package
        cp -r dist/* release-package/
        tar -czf spectravisio-${{ github.event.release.tag_name }}.tar.gz release-package/
        
    - name: Upload release assets
      uses: actions/upload-release-asset@v1
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        upload_url: ${{ github.event.release.upload_url }}
        asset_path: ./spectravisio-${{ github.event.release.tag_name }}.tar.gz
        asset_name: spectravisio-${{ github.event.release.tag_name }}.tar.gz
        asset_content_type: application/gzip
```

### 2. Quality Gates

**scripts/quality-gates.js:**
```javascript
const fs = require('fs');
const path = require('path');

class QualityGates {
  constructor() {
    this.results = {
      bundleSize: null,
      testCoverage: null,
      performanceScore: null,
      accessibilityScore: null
    };
  }

  async checkBundleSize() {
    const statsPath = path.join(__dirname, '../dist/webpack-stats.json');
    const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    
    const mainAssets = stats.assets.filter(asset => 
      asset.name.includes('main.') && !asset.name.endsWith('.map')
    );
    
    const totalSize = mainAssets.reduce((sum, asset) => sum + asset.size, 0);
    const totalSizeKB = Math.round(totalSize / 1024);
    
    this.results.bundleSize = {
      size: totalSizeKB,
      passed: totalSizeKB < 500 // 500KB limit
    };
    
    console.log(`📦 Bundle size: ${totalSizeKB}KB`);
    return this.results.bundleSize.passed;
  }

  async checkTestCoverage() {
    const coveragePath = path.join(__dirname, '../coverage/coverage-summary.json');
    const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    
    const totalCoverage = coverage.total;
    const passed = totalCoverage.lines.pct >= 80 && 
                  totalCoverage.statements.pct >= 80 &&
                  totalCoverage.branches.pct >= 75;
    
    this.results.testCoverage = {
      lines: totalCoverage.lines.pct,
      statements: totalCoverage.statements.pct, 
      branches: totalCoverage.branches.pct,
      passed
    };
    
    console.log(`🧪 Test coverage: ${totalCoverage.lines.pct}%`);
    return passed;
  }

  async runAllGates() {
    console.log('🚦 Running Quality Gates...\n');
    
    const bundleCheck = await this.checkBundleSize();
    const coverageCheck = await this.checkTestCoverage();
    
    const allPassed = bundleCheck && coverageCheck;
    
    if (allPassed) {
      console.log('\n✅ All quality gates passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Quality gates failed!');
      console.log(JSON.stringify(this.results, null, 2));
      process.exit(1);
    }
  }
}

// Run quality gates
new QualityGates().runAllGates();
```

---

## 📊 MONITORING & ANALYTICS

### 1. Performance Monitoring

**analytics.js:**
```javascript
// src/utils/analytics.js
class PerformanceAnalytics {
  constructor() {
    this.metrics = {
      loadTime: 0,
      firstContentfulPaint: 0,
      timeToInteractive: 0,
      renderingFPS: [],
      pluginLoadTimes: new Map(),
      errorCount: 0
    };
  }

  init() {
    this.measurePageLoad();
    this.measureWebVitals();
    this.setupErrorTracking();
  }

  measurePageLoad() {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0];
      this.metrics.loadTime = navigation.loadEventEnd - navigation.loadEventStart;
      
      // Send to analytics
      this.sendMetric('page_load_time', this.metrics.loadTime);
    });
  }

  measureWebVitals() {
    // First Contentful Paint
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.firstContentfulPaint = entry.startTime;
          this.sendMetric('fcp', entry.startTime);
        }
      }
    }).observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.sendMetric('lcp', lastEntry.startTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.sendMetric('fid', entry.processingStart - entry.startTime);
      }
    }).observe({ entryTypes: ['first-input'] });
  }

  trackPluginPerformance(pluginId, loadTime, renderTime) {
    this.metrics.pluginLoadTimes.set(pluginId, {
      loadTime,
      renderTime,
      timestamp: Date.now()
    });
    
    this.sendMetric('plugin_performance', {
      plugin: pluginId,
      load_time: loadTime,
      render_time: renderTime
    });
  }

  trackError(error, context = {}) {
    this.metrics.errorCount++;
    
    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    this.sendError(errorData);
  }

  sendMetric(name, value) {
    // Google Analytics 4
    if (typeof gtag !== 'undefined') {
      gtag('event', name, {
        custom_parameter: value,
        event_category: 'performance'
      });
    }
    
    // Custom analytics endpoint
    fetch('/api/analytics/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, value, timestamp: Date.now() })
    }).catch(() => {}); // Silent fail
  }

  sendError(errorData) {
    // Error tracking service (Sentry, LogRocket, etc.)
    fetch('/api/analytics/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData)
    }).catch(() => {});
  }
}

export default new PerformanceAnalytics();
```

### 2. User Analytics

**user-analytics.js:**
```javascript
// src/utils/user-analytics.js
class UserAnalytics {
  constructor() {
    this.sessionStart = Date.now();
    this.interactions = [];
    this.pluginUsage = new Map();
  }

  trackPluginSwitch(fromPlugin, toPlugin) {
    this.interactions.push({
      type: 'plugin_switch',
      from: fromPlugin,
      to: toPlugin,
      timestamp: Date.now()
    });
    
    // Update usage stats
    const usage = this.pluginUsage.get(toPlugin) || { switches: 0, totalTime: 0 };
    usage.switches++;
    this.pluginUsage.set(toPlugin, usage);
    
    // Track in GA
    gtag('event', 'plugin_switch', {
      from_plugin: fromPlugin,
      to_plugin: toPlugin,
      event_category: 'engagement'
    });
  }

  trackParameterChange(plugin, parameter, value) {
    this.interactions.push({
      type: 'parameter_change',
      plugin,
      parameter,
      value,
      timestamp: Date.now()
    });
    
    gtag('event', 'parameter_change', {
      plugin_id: plugin,
      parameter_name: parameter,
      event_category: 'customization'
    });
  }

  trackFeatureUsage(feature, context = {}) {
    gtag('event', 'feature_usage', {
      feature_name: feature,
      ...context,
      event_category: 'features'
    });
  }

  getSessionReport() {
    const sessionDuration = Date.now() - this.sessionStart;
    const mostUsedPlugin = [...this.pluginUsage.entries()]
      .sort((a, b) => b[1].switches - a[1].switches)[0];
    
    return {
      sessionDuration,
      interactionCount: this.interactions.length,
      mostUsedPlugin: mostUsedPlugin?.[0],
      pluginSwitches: this.interactions.filter(i => i.type === 'plugin_switch').length,
      parameterChanges: this.interactions.filter(i => i.type === 'parameter_change').length
    };
  }

  sendSessionReport() {
    const report = this.getSessionReport();
    
    fetch('/api/analytics/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report)
    }).catch(() => {});
  }
}

export default new UserAnalytics();
```

---

## 🔒 SECURITY CONSIDERATIONS

### 1. Content Security Policy

**security-headers.js:**
```javascript
// headers for production
const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "media-src 'self' blob:",
    "connect-src 'self' https://api.spectravisio.dev",
    "worker-src 'self' blob:",
    "child-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': [
    'microphone=*',
    'camera=()',
    'geolocation=()',
    'payment=()'
  ].join(', ')
};

module.exports = securityHeaders;
```

---

*¡Guía de deployment completa para SpectraVisio! 🚀 Desde desarrollo hasta producción con todas las optimizaciones necesarias.*