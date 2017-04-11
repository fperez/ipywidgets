// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

window['requirejs'].config({
    map: {
        '*': {
            'jupyter-js-widgets': 'nbextensions/jupyter-js-widgets/extension',
        },
    }
});

var MIME_TYPE = 'application/vnd.jupyter.widget-view+json';
var CLASS_NAME = 'jupyter-widgets-output';

var mngr = require("./manager");
require("./save_state");
require("./embed_widgets");
var PhosphorWidget = require("@phosphor/widgets");

/**
 * Create a widget manager for a kernel instance.
 */
var handle_kernel = function(Jupyter, kernel) {
    if (kernel.comm_manager && kernel.widget_manager === undefined) {

        // Create a widget manager instance. Use the global
        // Jupyter.notebook handle.
        var manager = new mngr.WidgetManager(kernel.comm_manager, Jupyter.notebook);

        // For backwards compatibility and interactive use.
        Jupyter.WidgetManager = mngr.WidgetManager;

        // Store a handle to the manager so we know not to
        // another for this kernel. This also is a convenience
        // for the user.
        kernel.widget_manager = manager;
    }
};

function register_events(Jupyter, events, outputarea) {
    // If a kernel already exists, create a widget manager.
    if (Jupyter.notebook && Jupyter.notebook.kernel) {
        handle_kernel(Jupyter, Jupyter.notebook.kernel);
    }
    // When the kernel is created, create a widget manager.
    events.on('kernel_created.Kernel kernel_created.Session', function(event, data) {
        handle_kernel(Jupyter, data.kernel);
    });

    /**
     * Render data to the output area
     */
    function render(data, node) {
        // data is a model id
        var manager = Jupyter.notebook.kernel.widget_manager;
        if (!manager) {
            node.textContent = "Missing widget manager";
            return;
        }

        var model = manager.get_model(data.model_id);
        if (model) {
            model.then(function(model) {
                return manager.display_model(void 0, model, void 0);
            }).then(function(pwidget) {
                PhosphorWidget.Widget.attach(pwidget, node);
            });
        } else {
            node.textContent = "Widget not found: "+JSON.stringify(data);
        }
    }


    var append_mime = function(json, md, element) {
        var type = MIME_TYPE;
        var toinsert = this.create_output_subarea(md, CLASS_NAME, type);
        this.keyboard_manager.register_events(toinsert);
        render(json, toinsert[(0)]);
        element.append(toinsert);
        return toinsert;
    };
    // Register mime type with the output area
    outputarea.OutputArea.prototype.register_mime_type(MIME_TYPE, append_mime, {
        // Is output safe (no Javascript)?
        safe: true,
        // Index of renderer in `output_area.display_order`
        index: 0
    });
}

function load_ipython_extension () {
    return new Promise(function(resolve) {
        requirejs([
            "base/js/namespace",
            "base/js/events",
            "notebook/js/outputarea"
        ], function(Jupyter, events, outputarea) {
            require("@phosphor/widgets/style/index.css")
            require('jupyter-js-widgets/css/widgets.css');
            register_events(Jupyter, events, outputarea);
            resolve();
        });
    });
}

var _ = require('underscore');
module.exports = _.extend({
  load_ipython_extension: load_ipython_extension,
}, require('jupyter-js-widgets'), require('./widget_output'));
