# SpectraVisio - Contributing Guidelines

**Versión:** 1.0  
**Fecha:** Enero 6, 2026  
**Autor:** [Tu Nombre]  
**Estado:** Draft

---

## 📖 Welcome Contributors!

¡Bienvenido a la comunidad de contribuidores de **SpectraVisio**! 🎉

Este documento contiene toda la información necesaria para:
- 🚀 **Getting Started** - Cómo empezar a contribuir
- 📝 **Contribution Types** - Formas de ayudar al proyecto
- 🏗️ **Development Setup** - Configuración del entorno
- 📋 **Guidelines** - Estándares y mejores prácticas
- 🔄 **Workflow** - Proceso de contribución step-by-step

---

## 🌟 WAYS TO CONTRIBUTE

### 1. 🐛 Bug Reports
¿Encontraste un bug? ¡Ayúdanos a mejorarlo!

**Cómo reportar:**
1. Buscar si ya existe un issue similar
2. Crear nuevo issue con template de bug report
3. Incluir steps para reproducir
4. Agregar screenshots/videos si aplica
5. Incluir información del sistema

### 2. 💡 Feature Requests
¿Tienes una idea genial para SpectraVisio?

**Proceso:**
1. Discutir en Discord #feature-requests
2. Crear GitHub issue con template
3. Describir el problema que soluciona
4. Proponer implementación si es posible
5. Participar en discusión comunitaria

### 3. 🔌 Plugin Development
Crea visualizaciones increíbles para la comunidad!

**Tipos de plugins:**
- **Visual Effects**: Nuevas visualizaciones
- **Audio Processors**: Algoritmos de análisis
- **UI Components**: Controles personalizados
- **Utility Plugins**: Herramientas y helpers

### 4. 📚 Documentation
Ayuda a otros usuarios y desarrolladores.

**Áreas:**
- API documentation
- Tutorial creation
- Translation (i18n)
- User guides
- Developer guides

### 5. 🧪 Testing & QA
Asegurar calidad y estabilidad.

**Actividades:**
- Manual testing de new features
- Automated test creation
- Performance testing
- Cross-browser testing
- Mobile testing

### 6. 🎨 Design & UX
Mejorar la experiencia de usuario.

**Contribuciones:**
- UI/UX design improvements
- Icon and asset creation
- Branding and visual identity
- Accessibility improvements
- User research

---

## 🚀 GETTING STARTED

### 1. Prerequisites

**Software requerido:**
- **Git**: Version control
- **Node.js**: v18 o superior
- **NPM**: Package manager (incluido con Node)
- **Code Editor**: VS Code recomendado

**Cuentas necesarias:**
- **GitHub**: Para code contributions
- **Discord**: Para comunicación comunitaria

### 2. Fork & Clone

```bash
# 1. Fork el repositorio en GitHub
# Ir a https://github.com/spectravisio/spectravisio
# Click "Fork" button

# 2. Clonar tu fork
git clone https://github.com/tu-usuario/spectravisio.git
cd spectravisio

# 3. Agregar upstream remote
git remote add upstream https://github.com/spectravisio/spectravisio.git

# 4. Verificar remotes
git remote -v
# origin    https://github.com/tu-usuario/spectravisio.git (fetch)
# origin    https://github.com/tu-usuario/spectravisio.git (push)
# upstream  https://github.com/spectravisio/spectravisio.git (fetch)
# upstream  https://github.com/spectravisio/spectravisio.git (push)
```

### 3. Development Setup

```bash
# Instalar dependencias
npm install

# Setup development environment
cp .env.example .env.development
# Editar .env.development con configuración local

# Ejecutar desarrollo
npm run dev
# Servidor disponible en http://localhost:3000

# Ejecutar tests
npm test

# Ejecutar linting
npm run lint
```

### 4. Project Structure

```
spectravisio/
├── 📁 src/                    # Source code
│   ├── 📁 core/              # Core framework
│   ├── 📁 plugins/           # Built-in plugins
│   ├── 📁 ui/                # User interface
│   ├── 📁 audio/             # Audio processing
│   ├── 📁 utils/             # Utilities
│   └── 📄 index.js           # Entry point
├── 📁 docs/                   # Documentation
├── 📁 tests/                  # Test suites
│   ├── 📁 unit/              # Unit tests
│   ├── 📁 integration/       # Integration tests
│   └── 📁 e2e/               # End-to-end tests
├── 📁 scripts/               # Build and utility scripts
├── 📁 public/                # Static assets
└── 📄 package.json           # Project config
```

---

## 📋 DEVELOPMENT GUIDELINES

### 1. Code Style

Usamos **ESLint** y **Prettier** para mantener consistencia.

**Configuración automática:**
```bash
# Install VS Code extensions
# - ESLint
# - Prettier
# - GitLens (recomendado)

# Format on save habilitado automáticamente
```

**Estilo de código:**
```javascript
// ✅ Good
class AudioAnalyzer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...options };
    this.isInitialized = false;
  }

  async initialize() {
    try {
      await this.setupAnalysis();
      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
}

// ❌ Avoid
function audioAnalyzer(opts){
    var config = Object.assign({}, opts);
    // No error handling
    // Inconsistent naming
    // No documentation
}
```

### 2. Commit Guidelines

Seguimos **Conventional Commits** para mensajes claros y automación.

**Format:**
```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: Nueva feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Formatting (no código)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Build/tools changes

**Examples:**
```bash
# Feature
git commit -m "feat(plugins): add plasma visualizer with color customization"

# Bug fix
git commit -m "fix(audio): resolve microphone permission handling on Safari"

# Documentation
git commit -m "docs(api): add examples for plugin parameter definitions"

# Breaking change
git commit -m "feat(core): redesign plugin loading system

BREAKING CHANGE: Plugin interface has changed, see migration guide"
```

### 3. Documentation Standards

**JSDoc for code:**
```javascript
/**
 * Analyzes audio data and extracts frequency information
 * @param {Uint8Array} frequencyData - Raw FFT frequency data
 * @param {Object} options - Analysis options
 * @param {number} options.sampleRate - Audio sample rate in Hz
 * @param {boolean} options.normalizeOutput - Whether to normalize to 0-1 range
 * @returns {AudioAnalysisResult} Processed frequency analysis
 * @example
 * const analysis = analyzer.analyzeFrequencies(fftData, {
 *   sampleRate: 44100,
 *   normalizeOutput: true
 * });
 */
analyzeFrequencies(frequencyData, options = {}) {
  // Implementation...
}
```

**Markdown for docs:**
```markdown
# Clear hierarchical headings

## Use consistent formatting

### Code blocks with language specified

```javascript
// Commented examples
const example = 'with syntax highlighting';
```

**Important information in bold**

- Bullet points for lists
- Consistent indentation
- Links to relevant sections
```

### 4. Testing Standards

**Unit Tests:**
```javascript
// tests/unit/AudioAnalyzer.test.js
import AudioAnalyzer from '../../src/audio/AudioAnalyzer.js';
import { createMockAudioData } from '../helpers/mockData.js';

describe('AudioAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new AudioAnalyzer();
  });

  describe('analyzeFrequencies', () => {
    test('should return normalized values when requested', () => {
      const mockData = createMockAudioData();
      const result = analyzer.analyzeFrequencies(mockData, {
        normalizeOutput: true
      });

      expect(result.bass).toBeGreaterThanOrEqual(0);
      expect(result.bass).toBeLessThanOrEqual(1);
    });

    test('should handle empty frequency data gracefully', () => {
      const emptyData = new Uint8Array(1024);
      const result = analyzer.analyzeFrequencies(emptyData);

      expect(result).toBeDefined();
      expect(result.energy).toBe(0);
    });
  });
});
```

**Integration Tests:**
```javascript
// tests/integration/PluginSystem.test.js
describe('Plugin System Integration', () => {
  test('should load and initialize plugin correctly', async () => {
    const spectra = new SpectraVisio(createMockCanvas());
    await spectra.init();

    const pluginId = 'tunnel';
    await spectra.setPlugin(pluginId);

    expect(spectra.pluginManager.activePlugin).toBeDefined();
    expect(spectra.pluginManager.activePlugin.isInitialized).toBe(true);
  });
});
```

### 5. Performance Guidelines

**Memory Management:**
```javascript
// ✅ Use object pooling for frequent allocations
class ParticleSystem {
  constructor() {
    this.particlePool = [];
    this.activeParticles = [];
  }

  createParticle() {
    return this.particlePool.pop() || new Particle();
  }

  destroyParticle(particle) {
    particle.reset();
    this.particlePool.push(particle);
  }
}

// ❌ Avoid frequent object creation in hot paths
function render() {
  const particles = []; // New array every frame
  for (let i = 0; i < 1000; i++) {
    particles.push(new Particle()); // 1000 new objects per frame
  }
}
```

**Async Operations:**
```javascript
// ✅ Handle loading states properly
async loadResource(url) {
  this.isLoading = true;
  this.emit('loadingStarted');
  
  try {
    const resource = await fetch(url);
    this.emit('loadingComplete');
    return resource;
  } catch (error) {
    this.emit('loadingError', error);
    throw error;
  } finally {
    this.isLoading = false;
  }
}
```

---

## 🔄 CONTRIBUTION WORKFLOW

### 1. Planning Phase

**Before coding:**
1. **Discutir en Discord** si es una feature grande
2. **Crear o comentar** en GitHub issue relevante  
3. **Acordar approach** con maintainers si es necesario
4. **Planificar testing** strategy

### 2. Development Phase

**Setup branch:**
```bash
# Sync with upstream
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feat/my-awesome-feature

# Or for bug fix
git checkout -b fix/audio-permission-issue
```

**Development cycle:**
```bash
# Make changes
# Write tests
# Update documentation

# Run tests locally
npm test
npm run test:integration

# Lint code
npm run lint
npm run lint:fix

# Commit changes
git add .
git commit -m "feat: add my awesome feature"

# Push to your fork
git push origin feat/my-awesome-feature
```

### 3. Review Phase

**Create Pull Request:**
1. **Push branch** to your fork
2. **Open PR** on GitHub
3. **Fill PR template** completely
4. **Link related issues**
5. **Request review** from maintainers

**PR Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Refactoring

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Cross-browser testing (if applicable)

## Screenshots/Videos
<!-- Include for UI changes -->

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No breaking changes (or documented)

## Related Issues
Fixes #123
Relates to #456
```

### 4. Merge Process

**After approval:**
1. **Squash commits** if requested
2. **Update branch** with latest main if needed
3. **Merge** será hecho por maintainers
4. **Delete branch** después del merge

**Post-merge:**
```bash
# Update local main
git checkout main
git pull upstream main

# Delete feature branch
git branch -d feat/my-awesome-feature
git push origin --delete feat/my-awesome-feature
```

---

## 🔌 PLUGIN DEVELOPMENT

### 1. Plugin Structure

```
my-plugin/
├── 📄 src/
│   ├── 📄 MyPlugin.js         # Main plugin class
│   ├── 📄 effects/            # Helper effects
│   └── 📄 utils/              # Plugin utilities
├── 📄 config/
│   └── 📄 plugin.json         # Plugin metadata
├── 📄 assets/
│   ├── 📄 thumbnail.png       # 400x300 preview
│   └── 📄 demo.gif            # Animated demo
├── 📄 tests/
│   └── 📄 MyPlugin.test.js    # Unit tests
├── 📄 docs/
│   └── 📄 README.md           # Plugin documentation
└── 📄 package.json            # NPM configuration
```

### 2. Plugin Template

```javascript
// src/MyPlugin.js
import { BaseVisualizer } from 'spectravisio-core';

export default class MyPlugin extends BaseVisualizer {
  constructor(canvas, config = {}) {
    super(canvas, config);

    // Plugin metadata
    this.name = 'My Plugin';
    this.version = '1.0.0';
    this.author = 'Your Name';
    this.description = 'Description of what plugin does';
    this.category = 'abstract';
    this.tags = ['tag1', 'tag2'];

    // Performance info
    this.performance = {
      complexity: 'medium',
      targetFPS: 60,
      memoryUsage: 'low'
    };
  }

  getDefaultConfig() {
    return {
      speed: 1.0,
      color: '#ff6b6b',
      intensity: 0.8
    };
  }

  getParameterDefinitions() {
    return {
      speed: {
        type: 'range',
        min: 0.1,
        max: 5.0,
        step: 0.1,
        default: 1.0,
        label: 'Speed',
        description: 'Animation speed multiplier'
      },
      color: {
        type: 'color',
        default: '#ff6b6b',
        label: 'Color'
      }
    };
  }

  async init() {
    // Initialize plugin resources
    await this.loadAssets();
    this.setupRenderState();
    this.isInitialized = true;
  }

  render(audioData, deltaTime) {
    if (!this.isInitialized) return;

    // Your render implementation
    this.clearCanvas();
    this.drawVisualization(audioData, deltaTime);
  }

  destroy() {
    // Cleanup resources
    this.releaseAssets();
    super.destroy();
  }
}
```

### 3. Plugin Submission Process

**Preparation:**
1. **Complete development** and testing
2. **Create documentation** (README, examples)
3. **Generate assets** (thumbnail, demo GIF)
4. **Write unit tests**
5. **Performance validation**

**Submission:**
1. **Fork plugin-registry** repository
2. **Add plugin** to registry
3. **Create PR** with plugin files
4. **Fill submission template**
5. **Wait for review**

**Review Criteria:**
- ✅ Follows plugin API correctly
- ✅ Performance meets requirements
- ✅ Code quality and documentation
- ✅ Unique/valuable contribution
- ✅ Tests pass and coverage adequate

---

## 📞 COMMUNICATION

### 1. Discord Community

**Channels:**
- **#general**: General discussion
- **#development**: Technical discussions
- **#plugin-dev**: Plugin development help
- **#feature-requests**: New feature ideas
- **#showcase**: Show your creations
- **#help**: Get help with issues

**Etiquette:**
- 🔍 **Search before asking** - Check pinned messages and search history
- 📝 **Be descriptive** - Provide context and details
- 🤝 **Be respectful** - We're all here to learn and help
- 🎯 **Stay on-topic** - Use appropriate channels

### 2. GitHub Issues

**Using issues effectively:**
- **Search existing issues** before creating new ones
- **Use templates** when available
- **Provide clear reproduction steps** for bugs
- **Include system information** when relevant
- **Follow up** on your issues

### 3. Code Reviews

**As reviewer:**
- ✅ **Be constructive** - Suggest improvements, don't just criticize
- 📚 **Explain reasoning** - Help the author learn
- 🎯 **Focus on code** - Review the code, not the person
- ⚡ **Be timely** - Review promptly to keep momentum

**As reviewee:**
- 🤔 **Be open to feedback** - Consider all suggestions carefully
- 💬 **Ask for clarification** if feedback is unclear
- 📝 **Respond to comments** - Acknowledge feedback
- 🔧 **Make requested changes** or explain why not

---

## 🏆 RECOGNITION

### 1. Contributors Hall of Fame

Reconocemos contribuciones en:
- **GitHub README** - Lista de contributors
- **Website credits** - Página de reconocimientos
- **Discord roles** - Roles especiales para contributors
- **Swag program** - Stickers y merchandise para contributors activos

### 2. Contribution Types Recognition

**Code Contributors:**
- Core framework developers
- Plugin creators
- Bug fixes and improvements
- Performance optimizations

**Non-Code Contributors:**
- Documentation writers
- Community managers
- Designers and artists
- Testers and QA

**Special Recognition:**
- **First-time contributors** - Welcome package
- **Regular contributors** - Special Discord roles
- **Major contributions** - Featured in releases
- **Community leaders** - Moderator privileges

---

## 📚 RESOURCES

### 1. Documentation
- **[API Reference](./SpectraVisio_API_Reference.md)** - Complete API documentation
- **[Plugin Dev Guide](./SpectraVisio_Plugin_Development_Guide.md)** - Plugin creation guide
- **[Technical Design](./SpectraVisio_TDD.md)** - Architecture overview
- **[Claude Practices](./claude.md)** - AI-assisted development

### 2. Tools
- **[VS Code Extensions]** - Development setup
- **[GitHub CLI]** - Command-line GitHub integration
- **[Discord Bot]** - Community management
- **[Testing Utils]** - Testing helpers and mocks

### 3. Community
- **[Discord Server]** - Real-time chat and help
- **[GitHub Discussions]** - Long-form discussions
- **[Twitter]** - Updates and announcements
- **[YouTube]** - Tutorials and showcases

---

## 🆘 GETTING HELP

### Quick Help

**Development Issues:**
1. **Check documentation** first
2. **Search Discord** #development channel
3. **Look through GitHub issues**
4. **Ask in appropriate Discord channel**

**Plugin Development:**
1. **Review Plugin Dev Guide**
2. **Check existing plugin examples**
3. **Ask in #plugin-dev Discord channel**
4. **Create GitHub issue** for bugs

### Detailed Support

**For complex issues:**
1. **Create detailed GitHub issue**
2. **Include reproduction steps**
3. **Add relevant code snippets**
4. **Tag appropriate maintainers**
5. **Be patient** - maintainers are volunteers

**Emergency (production issues):**
- **Create GitHub issue** with "urgent" label
- **Post in Discord** #development channel
- **Email maintainers** if no response in 24h

---

## 🎉 WELCOME TO THE TEAM!

¡Gracias por tu interés en contribuir a SpectraVisio! 

Tu ayuda hace que este proyecto sea mejor para toda la comunidad. No importa si es tu primera contribución a open source o eres un veterano - todos los tipos de ayuda son valiosos y apreciados.

**¿Listo para empezar?**
1. **Únete al Discord**: [discord.gg/spectravisio](https://discord.gg/spectravisio)
2. **Fork el repositorio**: [github.com/spectravisio/spectravisio](https://github.com/spectravisio/spectravisio)
3. **Lee las guías**: Especialmente relevantes para tu tipo de contribución
4. **¡Empieza a contribuir!**: Comienza con issues marcados como "good first issue"

**Happy coding! 🚀✨**

---

*Contributing Guidelines v1.0 - Enero 2026*