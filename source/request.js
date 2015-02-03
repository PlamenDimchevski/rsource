RS = (function ( RS ) {

   /**
    * Private methods
    *
    * @type {Object}
    */
   var requestJS = {

      /**
       * All dynamically loaded scripts container
       *
       * @type {Object}
       */
      scripts     : {},

      /**
       * Hash containing the methods per test type.
       * Each method, will receive one parameter (Array) with tests and have to return Boolean
       *
       * @type {Object}
       */
      testMethods : {

         /**
          * @method  namespace
          * @private
          *
          * @param   {Array}    tests
          *
          * @return  {Boolean}
          */
         namespace : function ( tests ) {
            return tests.every( function ( namespace ) {
               return namespace.split('.').reduce(function( parent, item ) {
                  return parent ? parent[item] : parent;
               }, window);
            });
         }
      },

      /**
       * Get script information from private @requestJS.scripts
       *
       * @method  getScriptData
       * @private
       *
       * @param   {String}     path
       *
       * @return  {Object}
       */
      getScriptData : function ( path ) {
         var path = requestJS.clearID( path );
         return requestJS.scripts[ path ] || {};
      },

      /**
       * Call all waiting callbacks per script and set identified that the script is loaded
       *
       * @method  executeCallback
       * @private
       *
       * @param   {String}         path
       *
       * @return  {undefined}
       */
      executeCallback : function ( path ) {
         var path = requestJS.clearID( path );
         requestJS.scripts[ path ].loaded = true;

         var list = requestJS.scripts[ path ].callbacks;
         for( var i = 0, l = list.length; i < l; i++ ) {
            list[i]();
         }

         requestJS.scripts[ path ].callbacks = [];
      },

      /**
       * Create DOM script element
       *
       * @method  createScripts
       * @private
       *
       * @param   {String}       path
       *
       * @return  {Object}       created DOM object
       */
      createScripts  : function ( path ) {
         return new Element('script', {
            id     : requestJS.clearID( path ),
            src    : requestJS.clearPath( path ),
            type   : 'text/javascript',
            events : {
               load : requestJS.executeCallback.bind( requestJS, path )
            }
         });
      },

      /**
       * @method  getScript
       * @private
       *
       * @param   {String}   path
       *
       * @return  {Object}
       */
      getScript : function ( path ) {
         var id = requestJS.getScriptID( path );
         return $( id ) || requestJS.getScriptData(path).script;
      },

      /**
       * Create script, if the script is in the dom, it will not create it again
       *
       * @method  setScript
       * @private
       *
       * @param   {String}  path
       */
      setScript : function ( path ) {
         var id = requestJS.clearID( path );

         requestJS.scripts[ id ] = Object.append(
            {
               id        : id,      // Script ID
               loaded    : false,   // Is script loaded
               script    : requestJS.getScript( path ) || requestJS.createScripts( path ),
               callbacks : [],      // List of callbacks to be executed upon loaded
               tests     : {}       // Hash of tests types, that will be performed before determining if the script have to be loaded
            },
            requestJS.getScriptData( path ) // Get Existing data for script
         );
      },

      /**
       * Remove http and https protocol from url
       *
       * @method  clearPath
       * @private
       *
       * @param   {String}   value
       *
       * @return  {String}
       */
      clearPath : function ( value ) {
         return value.replace(/^http(s)?\:/, '');
      },

      /**
       * Remove all illegal characters from the ID string
       *
       * @method  clearID
       * @private
       *
       * @param   {String}  value
       *
       * @return  {String}
       */
      clearID : function ( value ) {
         return requestJS.clearPath( value ).replace(/([^a-z0-9\_\-])/ig, '');
      },

      /**
       * @method  getScriptID
       * @private
       *
       * @param   {String}     path
       *
       * @return  {String}
       */
      getScriptID : function ( path ) {
         var path = this.clearID( path );

         return ( requestJS.scripts[ path ] || {} ).id;
      },

      /**
       * Change the ID for script, or set for given path a ID for which to look for
       *
       * @method  setScriptID
       * @private
       *
       * @param   {String}    path
       * @param   {String}    value
       */
      setScriptID : function ( path, value ) {
         var path = requestJS.clearID( path );
         var id   = requestJS.clearID( value );

         requestJS.scripts[ path ].id = id;
         requestJS.scripts[ path ].script.set( 'id', id );

         // Check if there is script with this id, if so replace it with the one created dynamically
         this.replaceExisting( path );
      },

      /**
       * Replace dynamically created script with one that was printed from another script,
       * or added manually to the DOM
       *
       * @method  replaceExisting
       * @private
       *
       * @param   {String}         path  Cleared ID
       *
       * @return  {undefined}
       */
      replaceExisting : function ( path ) {
         if ( requestJS.scripts[ path ].script != requestJS.getScript( path )) {
            requestJS.scripts[ path ].script.destroy();

            requestJS.scripts[ path ].loaded = true;                       // Assume, that the existing script is loaded
            requestJS.scripts[ path ].script = requestJS.getScript( path );

            // Execute all callbacks for this script
            requestJS.executeCallback( path );
         }
      },

      /**
       * Get test method
       *
       * @method  getTest
       * @private
       *
       * @param   {String}  method
       *
       * @return  {Function}
       */
      getTest : function ( method ) {
         return (requestJS.testMethods[ method ] || Function.from( true ));
      },

      /**
       * Perform tests to the script.
       * All test have to successful to passed
       *
       * @method  testScript
       * @private
       *
       * @param   {String}    path
       *
       * @return  {Boolean}
       */
      testScript : function ( path ) {
         var data = requestJS.getScriptData( path );

         return Object.every( data.tests, function ( tests, method ) {
            return !(requestJS.getTest( method ))( tests );
         });
      }
   };

   /**
    * @method  RequestJS
    * @private
    *
    * @param   {String}    path
    * @param   {Object}    parameters
    */
   RS.RequestJS = function ( path, parameters ) {

      parameters = parameters || {};

      /**
       * Internal path reference
       *
       * @type {String}
       */
      this.path = requestJS.clearPath( path );

      /**
       * Internal ID reference
       *
       * @type {String}
       */
      this.id   = requestJS.clearID( path );

      /**
       * Public methods
       *
       * @type {Object}
       */
      Object.append(this, {

         /**
          * @method  setID
          * @public
          *
          * @param   {String}          id
          *
          * @return  {RS.RequestJS}    To allow nesting
          */
         setID : function ( id ) {
            if ( !id ) {
               return this;
            }

            requestJS.setScriptID( this.path, id );
            return this;
         },

         /**
          * @method  getScript
          * @public
          *
          * @return  {Object}
          */
         getScript : function () {
            return requestJS.getScript( this.path );
         },

         /**
          * Execute given callback after script is loaded
          *
          * @method  then
          * @public
          *
          * @param   {Function}        callback
          *
          * @return  {RS.RequestJS}    To allow nesting
          */
         then : function ( callback ) {
            var data = requestJS.getScriptData( this.path );
            callback = callback || function () {};

            data.callbacks.push( callback );

            if ( data.loaded ) {
               requestJS.executeCallback( this.path );
            }

            return this;
         },

         /**
          * Inject the script in the given container, or in document.head
          *
          * @method  inject
          * @public
          *
          * @param   {String|DOMObject}
          *
          * @return  {RS.RequestJS}       To allow nesting
          */
         inject : function ( container ) {

            // Perform test on the Script and if passes, execute the pending callbacks, but do not inject the script
            if (!requestJS.testScript( this.path )) {
               requestJS.executeCallback( this.path );
               return this;
            }

            if ( requestJS.getScriptData( this.path ).loaded ) {
               return this;
            }

            this.container = container || document.head || document.getElementsByTagName('head')[0];
            this.getScript().inject( this.container );

            return this;
         },

         /**
          * Set test type and method globally for all scripts
          *
          * @method  addTest
          * @public
          *
          * @param   {Function}  callback
          * @param   {String}    type
          *
          * @return  {RS.RequestJS}    To allow nesting
          */
         addTest : function ( callback, type ) {
            requestJS.testMethods[ type ] = callback;

            return this;
         },

         /**
          * Add tests per type
          *
          * @method  setTest
          * @public
          *
          * @param   {Array}  tests  List of test, to be performed
          * @param   {String} type   Optional. By default 'namespace'
          *
          * @return  {RS.RequestJS}    To allow nesting
          */
         setTests : function ( tests, type ) {
            var type = type || 'namespace';

            if ( !tests ) {
               return this;
            }

            requestJS.scripts[ this.id ].tests[ type ] = (requestJS.scripts[ this.id ].tests[ type ] || []).concat( tests );
            return this;
         }

      });

      requestJS.setScript( path );

      this.then( parameters.callback );
      this.setID( parameters.id );
      this.setTests( parameters.tests );

      if ( parameters.inject !== false ) {
         this.inject( parameters.container );
      }

      return this;
   };

   return RS;
})(window.RS || {});