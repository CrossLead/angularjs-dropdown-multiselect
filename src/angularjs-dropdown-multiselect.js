'use strict';

var directiveModule = angular.module('angularjs-dropdown-multiselect', []);

directiveModule.directive('ngDropdownMultiselect', ['$filter', '$document', '$compile', '$parse',
    function ($filter, $document, $compile, $parse) {

        return {
            restrict: 'AE',
            require: 'ngModel',
            scope: {
                ngModel: '=',
                options: '=',
                extraSettings: '=',
                events: '=',
                searchFilter: '=?',
                translationTexts: '=',
                groupBy: '@'
            },
            template: function (element, attrs) {
                var checkboxes = attrs.checkboxes ? true : false;
                var groups = attrs.groupBy ? true : false;

                var template = '<div class="multiselect-parent btn-group dropdown-multiselect">';
                template += '<button type="button" ng-class="getButtonClasses()" ng-click="toggleDropdown($event)">';
                template += '<span ng-if="!settings.buttonIcon">{{getButtonText()}}&nbsp;<span class="caret"></span></span>';
                template += '<i ng-if="settings.buttonIcon" ng-class="settings.buttonIcon"></i>';
                template += '</button>';
                template += '<ul class="dropdown-menu dropdown-menu-form" ng-style="{display: open ? \'block\' : \'none\', height : settings.scrollable ? settings.scrollableHeight : \'auto\' }" style="overflow: scroll;" >';
                template += '<li ng-hide="!settings.showCheckAll || settings.selectionLimit > 0"><a data-ng-click="selectAll()" style="cursor: pointer;"><span class="glyphicon glyphicon-ok"></span>  {{texts.checkAll}}</a>';
                template += '<li ng-show="settings.showUncheckAll"><a data-ng-click="deselectAll();" style="cursor: pointer;"><span class="glyphicon glyphicon-remove"></span>   {{texts.uncheckAll}}</a></li>';
                template += '<li ng-hide="(!settings.showCheckAll || settings.selectionLimit > 0) && !settings.showUncheckAll" class="divider"></li>';
                template += '<li ng-show="settings.enableSearch"><div class="dropdown-header"><input type="text" class="form-control" style="width: 100%;" ng-model="searchFilter" placeholder="{{texts.searchPlaceholder}}" /></li>';
                template += '<li ng-show="settings.enableSearch" class="divider"></li>';

                if (groups) {
                    template += '<li ng-repeat-start="option in orderedItems | filter: searchFilter" ng-show="getPropertyForObject(option, settings.groupBy) !== getPropertyForObject(orderedItems[$index - 1], settings.groupBy)" role="presentation" class="dropdown-header">{{ getGroupTitle(getPropertyForObject(option, settings.groupBy)) }}</li>';
                    template += '<li ng-repeat-end role="presentation">';
                } else {
                    template += '<li role="presentation" ng-repeat="option in options | filter: searchFilter">';
                }

                template += '<a role="menuitem" tabindex="-1" ng-click="setSelectedItem(getPropertyForObject(option,settings.idProp))" style="cursor: pointer;">';

                if (checkboxes) {
                    template += '<div class="checkbox"><label><input class="checkboxInput" type="checkbox" ng-click="checkboxClick($event, getPropertyForObject(option,settings.idProp))" ng-checked="isChecked(getPropertyForObject(option,settings.idProp))" /> {{getPropertyForObject(option, settings.displayProp)}}</label></div></a>';
                } else {
                    template += '<span data-ng-class="{\'glyphicon glyphicon-ok\': isChecked(getPropertyForObject(option,settings.idProp))}"></span> {{getPropertyForObject(option, settings.displayProp)}}</a>';
                }

                template += '</li>';

                template += '<li class="divider" ng-show="settings.selectionLimit > 1"></li>';
                template += '<li role="presentation" ng-show="settings.selectionLimit > 1"><a role="menuitem">{{selectedLength}} {{texts.selectionOf}} {{settings.selectionLimit}} {{texts.selectionCount}}</a></li>';

                template += '<li ng-if="settings.loadMoreButton" style="text-align:center;"> <button type="button" class="btn btn-default" ng-click="externalEvents.loadMore()" style="width:90%;">Load More</button> </li>';

                template += '</ul>';
                template += '</div>';

                element.html(template);
            },
            link: function ($scope, $element, $attrs, ngModelCtrl) {
                var $dropdownTrigger = $element.children()[0];
                var dropdownMenu = $element.find('ul');

                $scope.toggleDropdown = function ($event) {
                    $event.stopPropagation();
                    $scope.open = !$scope.open;
                    if($scope.open){
                        if($scope.settings.appendToBody){
                            adjustDropdownPosition();
                        }

                        if ($scope.settings.closeOnBlur) {
                            $document.on('click', closeDropdown);
                        }
                    } else {
                        $scope.externalEvents.closeDropdown();
                        if ($scope.settings.closeOnBlur) {
                            $document.off('click', closeDropdown);
                        }
                    }
                };

                $scope.checkboxClick = function ($event, id) {
                    $scope.setSelectedItem(id);
                    $event.stopImmediatePropagation();
                };

                $scope.externalEvents = {
                    onItemSelect: angular.noop,
                    onItemDeselect: angular.noop,
                    onSelectAll: angular.noop,
                    onDeselectAll: angular.noop,
                    onInitDone: angular.noop,
                    onMaxSelectionReached: angular.noop,
                    onSearchFilterChanged: angular.noop,
                    closeDropdown: angular.noop,
                    loadMore: angular.noop
                };

                $scope.settings = {
                    dynamicTitle: true,
                    scrollable: false,
                    scrollableHeight: '300px',
                    closeOnBlur: true,
                    displayProp: 'label',
                    idProp: 'id',
                    externalIdProp: 'id',
                    enableSearch: false,
                    selectionLimit: 0,
                    showCheckAll: true,
                    showUncheckAll: true,
                    closeOnSelect: false,
                    buttonClasses: 'btn btn-default',
                    buttonSelectionsClasses: '',
                    buttonIcon: null,
                    closeOnDeselect: false,
                    groupBy: $attrs.groupBy || undefined,
                    groupByTextProvider: null,
                    smartButtonMaxItems: 0,
                    smartButtonTextConverter: angular.noop,
                    appendToBody: false,
                    loadMoreButton: false
                };

                $scope.texts = {
                    checkAll: 'Check All',
                    uncheckAll: 'Uncheck All',
                    selectionCount: 'checked',
                    selectionOf: '/',
                    searchPlaceholder: 'Search...',
                    buttonDefaultText: 'Select',
                    dynamicButtonTextSuffix: 'checked'
                };

                $scope.searchFilter = $scope.searchFilter || '';

                $scope.$watch('searchFilter', function(newValue) {
                  $scope.externalEvents.onSearchFilterChanged(newValue);
                });

                if (angular.isDefined($scope.settings.groupBy)) {
                    $scope.$watch('options', function (newValue) {
                        if (angular.isDefined(newValue)) {
                            $scope.orderedItems = $filter('orderBy')(newValue, $scope.settings.groupBy);
                        }
                    });
                }

                angular.extend($scope.settings, $scope.extraSettings || []);
                angular.extend($scope.externalEvents, $scope.events || []);
                angular.extend($scope.texts, $scope.translationTexts);

                $scope.singleSelection = $scope.settings.selectionLimit === 1;

                if($scope.settings.appendToBody){
                    angular.element('body').append(dropdownMenu);
                    dropdownMenu.css('position', 'absolute');
                }

                function adjustDropdownPosition() {
                    var offset = $element.offset();

                    var buttonHeight = $element.height();
                    var buttonWidth = $element.width();

                    var menuWidth = dropdownMenu.width();
                    var menuHeight = dropdownMenu.height();

                    var documentWidth = $document[0].documentElement.clientWidth;
                    var documentHeight = $document[0].documentElement.clientHeight;

                    var top = offset.top + buttonHeight;
                    var bottom = top + menuHeight;
                    var left = offset.left;
                    var right = left + menuWidth;

                    if(right > documentWidth) {
                        left = left - menuWidth + buttonWidth;
                    }

                    if(bottom > documentHeight) {
                        top = offset.top - menuHeight - 12; //magic number since "top" is the middle of the button
                    }

                    dropdownMenu.css('left', left + 'px');
                    dropdownMenu.css('top', top + 'px' );
                }

                function getFindObj(id) {
                    var findObj = {};

                    if ($scope.settings.externalIdProp === '') {
                        findObj[$scope.settings.idProp] = id;
                    } else {
                        findObj[$scope.settings.externalIdProp] = id;
                    }

                    return findObj;
                }

                function clearObjectViewValue() {
                    var copy = angular.copy(ngModelCtrl.$viewValue);
                    for (var prop in copy) {
                        delete copy[prop];
                    }
                    ngModelCtrl.$setViewValue(copy);
                }

                if ($scope.singleSelection) {
                    if (angular.isArray(ngModelCtrl.$viewValue) && ngModelCtrl.$viewValue.length === 0) {
                        clearObjectViewValue();
                    }
                }

                function closeDropdown(e) {
                    var target = e.target.parentElement;
                    var parentFound = false;

                    while (angular.isDefined(target) && target !== null && !parentFound) {
                        if (_.contains(target.className.split(' '), 'dropdown-menu-form') && !parentFound) {
                            parentFound = true;
                        }
                        target = target.parentElement;
                    }

                    if (!parentFound) {
                        $scope.$evalAsync(function () {
                            $scope.open = false;
                            $scope.externalEvents.closeDropdown();
                            $document.off('click', closeDropdown);
                        });
                    }
                }

                $scope.getGroupTitle = function (groupValue) {
                    if ($scope.settings.groupByTextProvider !== null) {
                        return $scope.settings.groupByTextProvider(groupValue);
                    }

                    return groupValue;
                };

                $scope.getButtonClasses = function() {
                    var baseClasses = $scope.settings.buttonClasses + ' button-dropdown ';
                    if(ngModelCtrl.$viewValue.length){
                       return baseClasses + $scope.settings.buttonSelectionsClasses;
                    } else {
                        return baseClasses;
                    }
                };

                $scope.getButtonText = function () {
                    if ($scope.settings.dynamicTitle && (ngModelCtrl.$viewValue.length > 0 || (angular.isObject(ngModelCtrl.$viewValue) && _.keys(ngModelCtrl.$viewValue).length > 0))) {
                        if ($scope.settings.smartButtonMaxItems > 0) {
                            var itemsText = [];

                            angular.forEach($scope.options, function (optionItem) {
                                if ($scope.isChecked($scope.getPropertyForObject(optionItem, $scope.settings.idProp))) {
                                    var displayText = $scope.getPropertyForObject(optionItem, $scope.settings.displayProp);
                                    var converterResponse = $scope.settings.smartButtonTextConverter(displayText, optionItem);

                                    itemsText.push(converterResponse ? converterResponse : displayText);
                                }
                            });

                            if (ngModelCtrl.$viewValue.length > $scope.settings.smartButtonMaxItems) {
                                itemsText = itemsText.slice(0, $scope.settings.smartButtonMaxItems);
                                itemsText.push('...');
                            }

                            return itemsText.join(', ');
                        } else {
                            var totalSelected;

                            if ($scope.singleSelection) {
                                totalSelected = (ngModelCtrl.$viewValue !== null && angular.isDefined(ngModelCtrl.$viewValue[$scope.settings.idProp])) ? 1 : 0;
                            } else {
                                totalSelected = angular.isDefined(ngModelCtrl.$viewValue) ? ngModelCtrl.$viewValue.length : 0;
                            }

                            if (totalSelected === 0) {
                                return $scope.texts.buttonDefaultText;
                            } else {
                                return totalSelected + ' ' + $scope.texts.dynamicButtonTextSuffix;
                            }
                        }
                    } else {
                        return $scope.texts.buttonDefaultText;
                    }
                };

                ngModelCtrl.$render = function() {
                    $scope.selectedLength = ngModelCtrl.$viewValue.length;
                };

                $scope.getPropertyForObject = function (object, property) {
                    if (angular.isDefined(object) && object.hasOwnProperty(property)) {
                        return object[property];
                    }

                    return '';
                };

                $scope.selectAll = function () {
                    $scope.deselectAll(false);
                    $scope.externalEvents.onSelectAll();

                    angular.forEach($scope.options, function (value) {
                        $scope.setSelectedItem(value[$scope.settings.idProp], true);
                    });
                };

                $scope.deselectAll = function (sendEvent) {
                    sendEvent = sendEvent || true;

                    if (sendEvent) {
                        $scope.externalEvents.onDeselectAll();
                    }

                    if ($scope.singleSelection) {
                        clearObjectViewValue();
                    } else {
                        ngModelCtrl.$setViewValue([]);
                    }

                    if($scope.settings.closeOnDeselect) {
                        $scope.$applyAsync(function () {
                            $scope.open = false;
                            $scope.externalEvents.closeDropdown();
                            $document.off('click', closeDropdown);
                        });
                    }
                };

                $scope.setSelectedItem = function (id, dontRemove) {
                    var findObj = getFindObj(id);
                    var finalObj = null;

                    if ($scope.settings.externalIdProp === '') {
                        finalObj = _.find($scope.options, findObj);
                    } else {
                        finalObj = findObj;
                    }

                    if ($scope.singleSelection) {
                        ngModelCtrl.$setViewValue(finalObj);
                        $scope.externalEvents.onItemSelect(finalObj);
                        if ($scope.settings.closeOnSelect) $scope.open = false;

                        return;
                    }

                    dontRemove = dontRemove || false;

                    var exists = _.findIndex(ngModelCtrl.$viewValue, findObj) !== -1;
                    var copy = angular.copy(ngModelCtrl.$viewValue);

                    if (!dontRemove && exists) {
                        copy.splice(_.findIndex(ngModelCtrl.$viewValue, findObj), 1);
                        ngModelCtrl.$setViewValue(copy);
                        $scope.externalEvents.onItemDeselect(findObj);
                    } else if (!exists && ($scope.settings.selectionLimit === 0 || ngModelCtrl.$viewValue.length < $scope.settings.selectionLimit)) {
                        copy.push(finalObj);
                        ngModelCtrl.$setViewValue(copy);
                        $scope.externalEvents.onItemSelect(finalObj);
                    }
                    if ($scope.settings.closeOnSelect) $scope.open = false;
                };

                $scope.isChecked = function (id) {
                    if ($scope.singleSelection) {
                        return ngModelCtrl.$viewValue !== null && angular.isDefined(ngModelCtrl.$viewValue[$scope.settings.idProp]) && ngModelCtrl.$viewValue[$scope.settings.idProp] === getFindObj(id)[$scope.settings.idProp];
                    }

                    return _.findIndex(ngModelCtrl.$viewValue, getFindObj(id)) !== -1;
                };

                $scope.externalEvents.onInitDone();

                $scope.$on('$destroy', function() {
                    if($scope.settings.appendToBody) {
                        angular.element('body').find('ul').remove();
                    }
                });
            }
        };
}]);
