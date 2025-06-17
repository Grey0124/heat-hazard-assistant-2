class ARSessionManager {
  constructor() {
    this.session = null;
    this.renderer = null;
    this.onSessionStart = null;
    this.onSessionEnd = null;
    this.onError = null;
  }

  async checkSupport() {
    try {
      if (!navigator.xr) {
        throw new Error('WebXR not supported in this browser');
      }

      const supported = await navigator.xr.isSessionSupported('immersive-ar');
      if (!supported) {
        throw new Error('AR not supported on this device');
      }

      return true;
    } catch (error) {
      console.error('AR Support Check Error:', error);
      throw error;
    }
  }

  async startSession(renderer, options = {}) {
    try {
      if (this.session) {
        await this.endSession();
      }

      const sessionOptions = {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['light-estimation', 'anchors', 'dom-overlay'],
        ...options
      };

      this.session = await navigator.xr.requestSession('immersive-ar', sessionOptions);
      this.renderer = renderer;

      // Set up the session
      this.setupSession();

      // Call the onSessionStart callback
      if (this.onSessionStart) {
        this.onSessionStart(this.session);
      }

      return this.session;
    } catch (error) {
      console.error('Failed to start AR session:', error);
      if (this.onError) {
        this.onError(error);
      }
      throw error;
    }
  }

  async endSession() {
    try {
      if (this.session) {
        await this.session.end();
        this.session = null;
        this.renderer = null;

        if (this.onSessionEnd) {
          this.onSessionEnd();
        }
      }
    } catch (error) {
      console.error('Error ending AR session:', error);
    }
  }

  setupSession() {
    if (!this.session || !this.renderer) return;

    try {
      // Enable XR on the renderer
      this.renderer.xr.enabled = true;

      // Set up the XR layer
      const xrLayer = new window.XRWebGLLayer(this.session, this.renderer.getContext());
      this.session.updateRenderState({ baseLayer: xrLayer });

      // Set up session event listeners
      this.session.addEventListener('end', () => {
        this.session = null;
        this.renderer = null;
        if (this.onSessionEnd) {
          this.onSessionEnd();
        }
      });

      this.session.addEventListener('visibilitychange', () => {
        if (this.session.visibilityState === 'hidden') {
          // Session is hidden, could pause rendering here
        }
      });

    } catch (error) {
      console.error('Error setting up AR session:', error);
      if (this.onError) {
        this.onError(error);
      }
    }
  }

  isSessionActive() {
    return this.session !== null;
  }

  getSession() {
    return this.session;
  }

  // Set up callbacks
  setCallbacks({ onSessionStart, onSessionEnd, onError }) {
    this.onSessionStart = onSessionStart;
    this.onSessionEnd = onSessionEnd;
    this.onError = onError;
  }
}

// Create a singleton instance
const arSessionManager = new ARSessionManager();

export default arSessionManager; 