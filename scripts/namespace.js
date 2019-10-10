/**
 *
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
(function(){ 
    var modules = {};
    var moduleDependantsMap = {};
    window.APP = window.APP || {};
    var STATES = {
        WAITING: 0,
        READY: 1,
    }
    
    function _getModuleByName(name) {
        return modules[name] 
    }
    function _isModuleLoaded(name) {
        var module = _getModuleByName(name);
        return module && module.state === STATES.READY;
    }
    
    function _hasModuleAllDependencies(module) {
        return module.dependencies.reduce(function(hasAllDependencies, dependencyName){
            return hasAllDependencies && _isModuleLoaded(dependencyName); 
        }, true) 
    }

    function _activateModule(module) {
        if (_hasModuleAllDependencies(module)){
            module.factory.apply(
                window,
                modules.dependencies.map(_getModuleByName)
            )
            module.state = STATES.READY;
            _onModuleReady(module);
        }
    }
    function _onModuleReady (module) {
        if (moduleDependantsMap[module.name]){
            moduleDependantsMap[module.name]
                .filter(_hasModuleAllDependencies)
                .forEach(_activateModule)
        }
    }
    function _registerDependencies() {
        module.dependencies.forEach(function(dependencyName){
            if (moduleDependantsMap[dependencyName]) {
                moduleDependantsMap[dependencyName].push(module)
            } else {
                moduleDependantsMap[dependencyName] = [module];
            }
        })
    }
    APP.register = function(name, dependencies = [], factory) {
        if (typeof name !== "string" || name.trim().length === 0) {
            name = Date.now().toString();
        }
        if (factory) {
            var module = modules[name] = {
                name, 
                factory,
                state: STATES.WAITING,
                dependencies
            };
            var hasDepencencies =  dependencies.length !== 0;

            if (hasDepencencies) {
                _registerDependencies(module);
                if (_hasModuleAllDependencies(module)){
                    _activateModule(module);
                }
            } else {
                _activateModule(module);
            }
        }
    }
})()