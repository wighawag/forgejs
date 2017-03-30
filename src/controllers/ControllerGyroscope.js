/**
 * This controller takes gyroscope events on screen to animate camera moves.
 *
 * @constructor FORGE.ControllerGyroscope
 * @param {FORGE.Viewer} viewer - viewer reference
 * @param {ControllerInstanceConfig} config - the configuration of the controller
 * @extends {FORGE.ControllerBase}
 */
FORGE.ControllerGyroscope = function(viewer, config)
{
    /**
     * Configuration
     * @name FORGE.ControllerGyroscope#_config
     * @type {ControllerInstanceConfig}
     * @private
     */
    this._config = config;

    /**
     * Position euler.
     * @name FORGE.ControllerGyroscope#_posEuler
     * @type {THREE.Euler}
     * @private
     */
    this._posEuler = null;

    /**
     * The intermediate quaternion where the position is computed.
     * @name FORGE.ControllerGyroscope#_posQuatIndermediate
     * @type {THREE.Quaternion}
     * @private
     */
    this._posQuatIndermediate = null;

    /**
     * The offset quaternion of the camera, given the touch and lookat of the camera
     * @name FORGE.ControllerGyroscope#_posQuatOffset
     * @type {THREE.Quaternion}
     * @private
     */
    this._posQuatOffset = null;

    /**
     * The quaternion to add given the orientation of the screen
     * @name FORGE.ControllerGyroscope#_posQuatScreenOrientation
     * @type {THREE.Quaternion}
     * @private
     */
    this._posQuatScreenOrientation = null;

    /**
     * Quaternion result of the position.
     * @name FORGE.ControllerGyroscope#_posQuatFinal
     * @type {THREE.Quaternion}
     * @private
     */
    this._posQuatFinal = null;

    /**
     * Orientation of the screen (not the device !)
     * @name FORGE.ControllerGyroscope#_screenOrientation
     * @type {number}
     * @private
     */
    this._screenOrientation = 0;

    FORGE.ControllerBase.call(this, viewer, "ControllerGyroscope");
};

FORGE.ControllerGyroscope.prototype = Object.create(FORGE.ControllerBase.prototype);
FORGE.ControllerGyroscope.prototype.constructor = FORGE.ControllerGyroscope;

/**
 * Boot sequence
 * @method FORGE.ControllerGyroscope#_boot
 * @private
 */
FORGE.ControllerGyroscope.prototype._boot = function()
{
    FORGE.ControllerBase.prototype._boot.call(this);

    this._posEuler = new THREE.Euler();
    this._posQuatIndermediate = new THREE.Quaternion();
    this._posQuatOffset = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
    this._posQuatScreenOrientation = new THREE.Quaternion();
    this._posQuatFinal = new THREE.Quaternion();

    this._parseConfig(this._config);

    if (this._enabled === true && FORGE.Device.gyroscope)
    {
        this.enable();
    }
};

/**
 * Parse the configuration.
 * @method FORGE.ControllerGyroscope#_parseConfig
 * @param {ControllerInstanceConfig} config - configuration object to parse.
 */
FORGE.ControllerGyroscope.prototype._parseConfig = function(config)
{
    this._uid = config.uid;
    this._register();

    this._enabled = (typeof config.enabled === "boolean") ? config.enabled : false;
};

/**
 * Orientation change handler.
 * @method FORGE.ControllerGyroscope#_deviceOrientationChangeHandler
 * @param {FORGE.Event} event - Event object
 * @private
 */
FORGE.ControllerGyroscope.prototype._deviceOrientationChangeHandler = function(event)
{
    if (this._viewer.controllers.enabled === false)
    {
        return;
    }

    var position = /** @type {DeviceOrientationEvent} */ (event.data);

    if (typeof position.alpha === "number" && typeof position.beta === "number" && typeof position.gamma === "number")
    {
        // Set the position in correct Euler coordinates
        this._posEuler.set(FORGE.Math.degToRad(position.beta), FORGE.Math.degToRad(position.alpha), -FORGE.Math.degToRad(position.gamma), "YXZ");
        this._posQuatIndermediate.setFromEuler(this._posEuler);

        // Add the offset provided by the camera or the touch
        this._posQuatIndermediate.multiply(this._posQuatOffset);

        // Adjust given the screen orientation
        this._posQuatScreenOrientation.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -this._screenOrientation);
        this._posQuatIndermediate.multiply(this._posQuatScreenOrientation);

        // Final inversion, see FORGE.RenderDisplay#getQuaternionFromPose method
        this._posQuatFinal.set(-this._posQuatIndermediate.y, -this._posQuatIndermediate.x, -this._posQuatIndermediate.z, this._posQuatIndermediate.w);
    }
};

/**
 * Scren orientation change event.
 * @method FORGE.ControllerGyroscope#_screenOrientationChangeHandler
 * @private
 */
FORGE.ControllerGyroscope.prototype._screenOrientationChangeHandler = function()
{
    if (typeof screen.orientation !== "undefined")
    {
        this._screenOrientation = FORGE.Math.degToRad(screen.orientation.angle);
    }
    else if (typeof window.orientation !== "undefined")
    {
        this._screenOrientation = FORGE.Math.degToRad(window.orientation);
    }
};

/**
 * Enable controller
 * @method FORGE.ControllerGyroscope#enable
 */
FORGE.ControllerGyroscope.prototype.enable = function()
{
    if (this._viewer.controllers.enabled === false || this._config.enabled === false)
    {
        return;
    }

    FORGE.ControllerBase.prototype.enable.call(this);

    this._viewer["gyroscope"].onDeviceOrientationChange.add(this._deviceOrientationChangeHandler, this);
    this._viewer["gyroscope"].onScreenOrientationChange.add(this._screenOrientationChangeHandler, this);

    this._screenOrientationChangeHandler();
    this._deviceOrientationChangeHandler();
};

/**
 * Disable controller
 * @method FORGE.ControllerGyroscope#disable
 */
FORGE.ControllerGyroscope.prototype.disable = function()
{
    if (this._viewer.controllers.enabled === false || this._config.enabled === false)
    {
        return;
    }

    FORGE.ControllerBase.prototype.disable.call(this);

    this._viewer["gyroscope"].onDeviceOrientationChange.remove(this._deviceOrientationChangeHandler, this);
    this._viewer["gyroscope"].onScreenOrientationChange.remove(this._screenOrientationChangeHandler, this);
};

/**
 * Update routine.
 * @method FORGE.ControllerGyroscope#update
 */
FORGE.ControllerGyroscope.prototype.update = function()
{
    if (this._enabled === true)
    {
        this._viewer.camera.quaternion = this._posQuatFinal;
    }
};

/**
 * Destroy squence
 * @method FORGE.ControllerGyroscope#destroy
 * @private
 */
FORGE.ControllerGyroscope.prototype.destroy = function()
{
    this.disable();

    this._posEuler = null;
    this._posQuatIndermediate = null;
    this._posQuatOffset = null;
    this._posQuatScreenOrientation = null;
    this._posQuatFinal = null;

    FORGE.ControllerBase.prototype.destroy.call(this);
};
