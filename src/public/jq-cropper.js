// Based on https://tympanus.net/Tutorials/ImageResizeCropCanvas/

var thumbnailPicker =
    {
        image:null,
        picker:null,

        originSrc:new Image(),
        container:null,
        resizeCanvas:document.createElement('canvas'),
        eventState:{},

        options: {
            debugMode:true,
            debugLevel:0,
            constrain:true,
            imageMustFillPicker:false,
            fitImageToPickerOnInit:false,
            height: {
                min:300,
                max:600 },
            width: {
                min:300,
                max:600 }
        },

        callbacks : {},
        callbacksInternal: {},


        init:function(image, picker)
        {
            this.debug('method: init | start', 0);
            this.image = image;
            this.picker = picker;

            this.originSrc.src = this.image.attr('src');

            // Add resize handles to image
            var rh = 'resize-handle';
            image.wrap('<div class="resize-container"></div>')
                .before('<span class="'+rh+' '+rh+'-nw"></span>')
                .before('<span class="'+rh+' '+rh+'-ne"></span>')
                .after('<span class="'+rh+' '+rh+'-se"></span>')
                .after('<span class="'+rh+' '+rh+'-sw"></span>');
            this.container = this.image.parent('.resize-container');

            this.container.on('mousedown touchstart', '.resize-handle', {method:'resizeStart'}, thumbnailPicker.delegator);
            this.container.on('mousedown touchstart', 'img', {method:'moveStart'}, thumbnailPicker.delegator);

            if(this.options.fitImageToPickerOnInit)
            {
                this.fitImageToPicker();
            } else {
                this.initImage();
            }

            this.callBack('init');
        },

        initImage:function()
        {
            //todo: give console warning messages about the bounds and min/max image sizes not matching.

            this.debug('method: initImage | start', 0);
            var result = this.boundaryCheck();

            if(!result.reason.length) return;

            switch (result.reason[0])
            {
                case 'width-min':
                    this.callbacksInternal.resizeApply = 'initImage';
                    this.resizeApply(result.bounds.width.min);
                    break;
                case 'width-max':
                    this.callbacksInternal.resizeApply = 'initImage';
                    this.resizeApply(result.bounds.width.max);
                    break;
                case 'height-min':
                    this.callbacksInternal.resizeApply = 'initImage';
                    this.resizeApply(null, result.bounds.height.min);
                    break;
                case 'height-max':
                    this.callbacksInternal.resizeApply = 'initImage';
                    this.resizeApply(null, result.bounds.height.max);
                    break;
                case 'bounds-top':
                    this.callbacksInternal.moveApply = 'initImage';
                    this.moveApply(null, result.bounds.top);
                    break;
                case 'bounds-right':
                    this.callbacksInternal.moveApply = 'initImage';
                    var moveRight = (result.bounds.right - result.container.right) + result.container.left;
                    this.moveApply(moveRight);
                    break;
                case 'bounds-bottom':
                    this.callbacksInternal.moveApply = 'initImage';
                    var moveBottom = (result.bounds.bottom - result.container.bottom) + result.container.top;
                    this.moveApply(null, moveBottom);
                    break;
                case 'bounds-left':
                    this.callbacksInternal.moveApply = 'initImage';
                    this.moveApply(result.bounds.left);
                    break;
            }

            this.callBack('initImage');
        },

        fitIamgeToBounds:function()
        {

        },

        delegator:function(e)
        {
            thumbnailPicker[e.data.method](e);
        },

        fitImageToPicker:function()
        {
            this.debug('method: fitImageToPicker | start', 0);
            this.debug('method: fitImageToPicker | dimensions:', 1);
            this.debug('container: ' + this.container.width() + ' x ' + this.container.height() + ' picker: ' + this.picker.width() + ' x ' + this.picker.height(), 1);

            var width, height, top, left, container = this.container, picker = this.picker;
            var xDiff = function() { return (container.offset().left + container.width()) - (picker.offset().left + picker.width())};
            var yDiff = function() { return (container.offset().top + container.height()) - (picker.offset().top + picker.height())};

            //Align image and picker's top left corners.
            this.moveApply(picker.offset().left, picker.offset().top);

            this.debug('method: fitImageToPicker | xDiff: ' + xDiff() + ' yDiff: ' + yDiff(), 1);

            if(xDiff() > yDiff()) { // Landscape
                height = this.picker.height();
            } else { // Portrait
                width = this.picker.width();
            }

            this.debug('method: fitImageToPicker | attempting to apply: ' + width + ' x ' + height, 1);
            this.resizeApply(width, height, null, null, function() {
                if(xDiff() > yDiff()) {
                    top = picker.offset().top;
                    left = container.offset().left - (xDiff()/2);
                } else {
                    top = container.offset().top - (yDiff()/2);
                    left = picker.offset().left;
                }

                thumbnailPicker.debug('method: fitImageToPicker | xDiff (again): ' + xDiff() + ' yDiff: ' + yDiff(), 1);
                thumbnailPicker.debug('method: fitImageToPicker | attempting to apply left: ' + left + ' top: ' + top, 1);
                thumbnailPicker.moveApply(left, top);
            });

            this.callBack('fitImageToPicker');
        },

        saveEventState:function(e)
        {
            this.debug('method: saveEventState | start', 0);
            // Save the initial event details and container state
            this.eventState.container_width = this.container.width();
            this.eventState.container_height = this.container.height();
            this.eventState.container_left = this.container.offset().left;
            this.eventState.container_top = this.container.offset().top;
            this.eventState.mouse_x = (e.clientX || e.pageX || e.originalEvent.touches[0].clientX) + $(window).scrollLeft();
            this.eventState.mouse_y = (e.clientY || e.pageY || e.originalEvent.touches[0].clientY) + $(window).scrollTop();

            // This is a fix for mobile safari
            // For some reason it does not allow a direct copy of the touches property
            if(typeof e.originalEvent.touches !== 'undefined'){
                this.eventState.touches = [];
                $.each(e.originalEvent.touches, function(i, ob){
                    thumbnailPicker.eventState.touches[i] = {};
                    thumbnailPicker.eventState.touches[i].clientX = 0+ob.clientX;
                    thumbnailPicker.eventState.touches[i].clientY = 0+ob.clientY;
                });
            }
            this.eventState.evnt = e;
        },

        boundaryCheck:function(width, height, left, top)
        {
            this.debug('method: boundaryCheck | start', 0);
            var check =  {result:true, reason:[], bounds:{}, container:{}};

            if(!this.options.imageMustFillPicker) return check;

            width = (!width) ? this.container.width() : width;
            height = (!height) ? this.container.height() : height;
            left = (!left) ? this.container.offset().left : left;
            top = (!top) ? this.container.offset().top : top;

            var bounds =
            {
                height:this.options.height,
                width:this.options.width,
                top:this.picker.offset().top,
                right:this.picker.offset().left + this.picker.width(),
                bottom:this.picker.offset().top + this.picker.height(),
                left:this.picker.offset().left
            };

            var container =
            {
                top:top,
                right:left + this.container.width(),
                bottom:top + this.container.height(),
                left:left
            };

            check.bounds = bounds;
            check.container = container;

            // width min
            if(width < bounds.width.min)
            {
                check.result = false;
                check.reason.push('width-min');
            }

            // width max
            if(width > bounds.width.max)
            {
                check.result = false;
                check.reason.push('width-max');
            }

            // height min
            if(height < bounds.height.min)
            {
                check.result = false;
                check.reason.push('height-min');
            }

            // height max
            if(height > bounds.height.max)
            {
                check.result = false;
                check.reason.push('height-max');
            }

            // top bounds
            if(container.top > bounds.top)
            {
                check.result = false;
                check.reason.push('bounds-top');
            }

            // right bounds
            if(container.right < bounds.right)
            {
                check.result = false;
                check.reason.push('bounds-right');
            }

            // bottom bounds
            if(container.bottom < bounds.bottom)
            {
                check.result = false;
                check.reason.push('bounds-bottom');
            }

            // left bounds
            if(container.left > bounds.left)
            {
                check.result = false;
                check.reason.push('bounds-left');
            }

            if(!check.result) this.debug('method: boundaryCheck | fail reasons: ' + check.reason, 1);
            if(!check.result) console.log(container);
            if(!check.result) console.log(bounds);

            this.callBack('boundaryCheck');
            return check;
        },

        resizeStart:function(e)
        {
            this.debug('method: resizeStart | start', 0);
            e.preventDefault();
            e.stopPropagation();
            this.saveEventState(e);
            $(document).on('mousemove touchmove', {method:'resize'},  thumbnailPicker.delegator);
            $(document).on('mouseup touchend', {method:'resizeEnd'},  thumbnailPicker.delegator);

            this.callBack('resizeStart');
        },

        resizeEnd:function(e)
        {
            this.debug('method: resizeEnd | start', 0);
            e.preventDefault();
            $(document).off('mousemove touchmove', thumbnailPicker.delegator);
            $(document).off('mouseup touchend', thumbnailPicker.delegator);

            this.callBack('resizeEnd');
        },

        resize:function(e)
        {
            this.debug('method: resize | start', 0);
            var mouse={},width,height,left,top;//,offset=this.container.offset();
            mouse.x = (e.clientX || e.pageX || e.originalEvent.touches[0].clientX) + $(window).scrollLeft();
            mouse.y = (e.clientY || e.pageY || e.originalEvent.touches[0].clientY) + $(window).scrollTop();

            // Position image differently depending on the corner dragged and constraints
            if( $(this.eventState.evnt.target).hasClass('resize-handle-se') ){
                width = mouse.x - this.eventState.container_left;
                height = mouse.y  - this.eventState.container_top;
                left = this.eventState.container_left;
                top = this.eventState.container_top;
            } else if($(this.eventState.evnt.target).hasClass('resize-handle-sw') ){
                width = this.eventState.container_width - (mouse.x - this.eventState.container_left);
                height = mouse.y  - this.eventState.container_top;
                left = mouse.x;
                top = this.eventState.container_top;
            } else if($(this.eventState.evnt.target).hasClass('resize-handle-nw') ){
                width = this.eventState.container_width - (mouse.x - this.eventState.container_left);
                height = this.eventState.container_height - (mouse.y - this.eventState.container_top);
                left = mouse.x;
                top = mouse.y;
                if(this.options.constrain || e.shiftKey){
                    top = mouse.y - ((width / this.originSrc.width * this.originSrc.height) - height);
                }
            } else if($(this.eventState.evnt.target).hasClass('resize-handle-ne') ){
                width = mouse.x - this.eventState.container_left;
                height = this.eventState.container_height - (mouse.y - this.eventState.container_top);
                left = this.eventState.container_left;
                top = mouse.y;
                if(this.options.constrain || e.shiftKey){
                    top = mouse.y - ((width / this.originSrc.width * this.originSrc.height) - height);
                }
            }

            // Optionally maintain aspect ratio
            height = (this.options.constrain || e.shiftKey) ? null : height;

            var widthHeight = this.getMissingHeightOrWidth(width, height);
            width = widthHeight.width;
            height = widthHeight.height;

            if(!this.boundaryCheck(width, height).result) return false;

            this.resizeApply(width, height, left, top);
            this.callBack('resize');
        },

        getMissingHeightOrWidth:function(width, height)
        {
            if(!width)
            {
                if(this.options.constrain) {
                    width = (height/this.originSrc.height) * this.originSrc.width;
                } else {
                    width = this.container.width()
                }
            }

            if(!height)
            {
                if(this.options.constrain) {
                    height = (width/this.originSrc.width) * this.originSrc.height;
                } else {
                    height = this.container.height()
                }
            }

            return {
                width:width,
                height:height
            };
        },

        resizeApply:function(width, height, left, top)
        {
            this.debug('method: resizeApply | start', 0);

            var widthHeight = this.getMissingHeightOrWidth(width, height);
            width = widthHeight.width;
            height = widthHeight.height;

            // Without this Firefox will not re-calculate the the image dimensions until drag end
            if(left && top) this.container.offset({'left': left, 'top': top});

            this.resizeCanvas.width = width;
            this.resizeCanvas.height = height;
            this.resizeCanvas.getContext('2d').drawImage(this.originSrc, 0, 0, width, height);

            this.image.on("load", function() {
                thumbnailPicker.callBack('resizeApply');
            }).attr('src', this.resizeCanvas.toDataURL("image/png"));

            return true;
        },

        moveStart: function(e)
        {
            this.debug('method: moveStart | start', 0);
            e.preventDefault();
            e.stopPropagation();
            this.saveEventState(e);

            $(document).on('mousemove touchmove', {method:'move'},  thumbnailPicker.delegator);
            $(document).on('mouseup touchend', {method:'moveEnd'},  thumbnailPicker.delegator);
            this.callBack('moveStart');
        },

        moveEnd: function(e)
        {
            this.debug('method: moveEnd | start', 0);
            e.preventDefault();
            $(document).off('mouseup touchend', thumbnailPicker.delegator);
            $(document).off('mousemove touchmove', thumbnailPicker.delegator);

            this.callBack('moveEnd');
        },

        move: function(e)
        {
            this.debug('method: move | start', 0)
            var  mouse={}, touches;
            e.preventDefault();
            e.stopPropagation();

            touches = e.originalEvent.touches;

            mouse.x = (e.clientX || e.pageX || touches[0].clientX) + $(window).scrollLeft();
            mouse.y = (e.clientY || e.pageY || touches[0].clientY) + $(window).scrollTop();

            var left = mouse.x - ( this.eventState.mouse_x - this.eventState.container_left );
            var top = mouse.y - ( this.eventState.mouse_y - this.eventState.container_top );

            if(!this.boundaryCheck(null, null, left, top).result) return false;

            this.moveApply(left, top);

            // Watch for pinch zoom gesture while moving
            if(this.eventState.touches && this.eventState.touches.length > 1 && touches.length > 1)
            {
                var width = this.eventState.container_width, height = this.eventState.container_height;
                var a = this.eventState.touches[0].clientX - this.eventState.touches[1].clientX;
                a = a * a;
                var b = this.eventState.touches[0].clientY - this.eventState.touches[1].clientY;
                b = b * b;
                var dist1 = Math.sqrt( a + b );

                a = e.originalEvent.touches[0].clientX - touches[1].clientX;
                a = a * a;
                b = e.originalEvent.touches[0].clientY - touches[1].clientY;
                b = b * b;
                var dist2 = Math.sqrt( a + b );

                var ratio = dist2 /dist1;

                width = width * ratio;
                height = height * ratio;
                this.resizeApply(width, height);
            }

            this.callBack('move');
        },

        moveApply: function(left, top)
        {
            this.debug('method: moveApply | start | left: ' + left + ' | top: ' + top , 0);

            this.container.offset({
                'left': left,
                'top': top
            });
            this.callBack('moveApply');
        },

        crop: function()
        {
            this.debug('method: crop | start', 0);

            //Find the part of the image that is inside the crop box
            var cropCanvas,
                left = this.picker.offset().left - this.container.offset().left,
                top =  this.picker.offset().top - this.container.offset().top,
                width = this.picker.width(),
                height = this.picker.height();

            cropCanvas = document.createElement('canvas');
            cropCanvas.width = width;
            cropCanvas.height = height;

            img = new Image();
            img.src = this.image.attr('src');

            cropCanvas.getContext('2d').drawImage(img, left, top, width, height, 0, 0, width, height);

            this.callBack('crop');
            return cropCanvas.toDataURL("image/png");
        },

        callBack: function(callback)
        {
            this.debug('method: callBack | start | callback: ' + callback, 0);
            // Internal Callback
            if(callback in this.callbacksInternal)
            {
                this.debug('method: callBack | Internal callback requested: ' + callback, 0);
                var callbackFunction = this.callbacksInternal[callback];

                delete this.callbacksInternal[callback];

                this[callbackFunction]();
            }

            // User Callback
            if(typeof this.callbacks[callback] === 'function')
            {
                this.debug('method: callBack | User Defined callback requested: ' + callback, 0);
                this.callbacks[callback]();
            }
        },

        debug: function(msg, level) {
            if(!this.options.debugMode) return null;
            if(level < this.options.debugLevel) return null;
            console.log(msg);
        }

    };