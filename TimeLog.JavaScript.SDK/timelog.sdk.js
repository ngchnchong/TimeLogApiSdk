/*
TimeLog.JavaScript.SDK v0.1-alpha
https://github.com/TimeLog/TimeLogApiSdk
Author: S�ren �xenhave, TimeLog A/S.
Attribution 4.0 International (CC BY 4.0)
*/
(function(timelog, $, undefined) {

    timelog.debug = false;

    var x2js = new X2JS();

    var templateGetToken =
        '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>' +
        '<GetToken xmlns="http://www.timelog.com/api/tlp/v1_2"><user>{0}</user><password>{1}</password></GetToken>' +
        '</s:Body></s:Envelope>';
    var templateGetTasksAllocated =
        '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>' +
        '<GetTasksAllocatedToEmployee xmlns="http://www.timelog.com/api/tlp/v1_6">' +
        '<initials>{0}</initials>' +
        '<token xmlns:d4p1="http://www.timelog.com/api/tlp/v1_3" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">' +
        '<d4p1:Initials>{1}</d4p1:Initials><d4p1:Expires>{2}</d4p1:Expires><d4p1:Hash>{3}</d4p1:Hash>' +
        '</token>' +
        '</GetTasksAllocatedToEmployee>' +
        '</s:Body></s:Envelope>';
    var templateInsertWork =
        '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>' +
        '<InsertWork xmlns="http://www.timelog.com/api/tlp/v1_6">' +
        '<work xmlns:i="http://www.w3.org/2001/XMLSchema-instance"><WorkUnit>' +
        '<GUID>{0}</GUID><AllocationGUID>{1}</AllocationGUID><TaskID>{2}</TaskID><EmployeeInitials>{3}</EmployeeInitials>' +
        '<Duration>{4}</Duration><StartDateTime>{5}</StartDateTime><EndDateTime>{6}</EndDateTime>' +
        '<Description>{7}</Description><TimeStamp>{8}</TimeStamp><IsEditable>false</IsEditable><AdditionalText i:nil="true" /><Details i:nil="true" />' +
        '</WorkUnit></work>' +
        '<source>50</source>' +
        '<token xmlns:d4p1="http://www.timelog.com/api/tlp/v1_3" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">' +
        '<d4p1:Initials>{9}</d4p1:Initials><d4p1:Expires>{10}</d4p1:Expires><d4p1:Hash>{11}</d4p1:Hash>' +
        '</token>' +
        '</InsertWork>' +
        '</s:Body></s:Envelope>';

    /* BASE INFORMATION
    ********************************************************/
    var _localStorageUrlKey = 'TimeLogUrl';
    var _localStorageUsernameKey = 'TimeLogUsername';
    var _localStoragePasswordKey = 'TimeLogPassword';
    var _localStorageTokenKey = 'TimeLogToken';
    var _url = '';
    var _username = '';

    timelog.url = function () {

        if (timelog.enableLocalStorageCache) {
            _url = localStorage.getItem(_localStorageUrlKey);
        }

        return _url;

    };

    timelog.username = function () {

        if (timelog.enableLocalStorageCache) {
            _username = localStorage.getItem(_localStorageUsernameKey);
        }

        return _username;

    };

    /* SETTINGS
    ********************************************************/

    // Disable to only use private variables for url, username and token.
    timelog.enableLocalStorageCache = true;

    // Automatically obtain token. Requires enableLocalStorageCache = true
    timelog.enableAutoLogin = true;


    /* PRIVATE HELPERS
    ********************************************************/
    function getSecurityServiceUrl() {
        var urlSecurityService = '{0}/WebServices/Security/V1_2/SecurityServiceSecure.svc';

        if ((_url == undefined || _url.length == 0) && timeog.enableLocalStorageCache) {
            _url = localStorage.getItem('TimeLogUrl');
        }

        _url = _url.replace('http://', 'https://');
        return urlSecurityService.replace('{0}', _url);
    }

    function getProjectManagementServiceUrl() {
        var urlProjectManagementService = '{0}/WebServices/ProjectManagement/V1_6/ProjectManagementServiceSecure.svc';

        if ((_url == undefined || _url.length == 0) && timeog.enableLocalStorageCache) {
            _url = localStorage.getItem('TimeLogUrl');
        }

        _url = _url.replace('http://', 'https://');
        return urlProjectManagementService.replace('{0}', _url);
    }

    /* TOKEN AND AUTHENTICATION HANDLING
    ********************************************************/
    var tokenInitials = '';
    var tokenExpires = new Date('2001-01-01 01:01:01');
    var tokenHash = '';
    timelog.getToken = function () {

        var token = { Initials: tokenInitials, Expires: tokenExpires, Hash: tokenHash };

        if (tokenInitials.length == 0 && timelog.enableLocalStorageCache) {
            if (timelog.debug) { console.log('[timelog.getToken] Restoring from localStorage'); }
            var rawToken = x2js.xml_str2json(localStorage.getItem(_localStorageTokenKey));

            if (rawToken != undefined) {
                token = rawToken.SecurityToken;
            }

            tokenInitials = token.Initials;
            tokenExpires = token.Expires;
            tokenHash = token.Hash;
        }

        if (timelog.enableAutoLogin && timelog.enableLocalStorageCache && new Date(token.Expires) < new Date()) {
            if (timelog.debug) { console.log('[timelog.getToken] AutoLogin enabled and token expired'); }
            timelog.tryAuthenticate('', '', '');
        }

        return token;

    };

    // Tries to authenticate and get a token.
    timelog.authenticateSuccessCallback = undefined;
    timelog.authenticateFailureCallback = undefined;
    timelog.tryAuthenticate = function(url, username, password) {

        if (timelog.debug) { console.log('[timelog.tryAuthenticate] Executing (url: ' + url + ', username: ' + username + ', password: ' + password + ')'); }
        if (timelog.enableLocalStorageCache) {

            if (url.length == 0) {
                url = localStorage.getItem(_localStorageUrlKey);
            } else {
                localStorage.setItem(_localStorageUrlKey, url);
            }

            if (username.length == 0) {
                username = localStorage.getItem(_localStorageUsernameKey);
            } else {
                localStorage.setItem(_localStorageUsernameKey, username);
            }

            if (password.length == 0 && localStorage.getItem(_localStoragePasswordKey) != undefined) {
                password = CryptoJS.AES.decrypt(localStorage.getItem(_localStoragePasswordKey), '0B1EC554C85C').toString(CryptoJS.enc.Utf8);
            } else if (password.length > 0) {
                localStorage.setItem(_localStoragePasswordKey, CryptoJS.AES.encrypt(password, '0B1EC554C85C'));
            }

            if (timelog.debug) { console.log('[timelog.tryAuthenticate] After localStorage fetch (url: ' + url + ', username: ' + username + ', password: ' + password + ')'); }
        }

        _url = url;
        _username = username;

        if (_url != undefined && _username != undefined && _url.length > 0 && _username.length > 0 && password.length > 0) {
            $.ajax({
                type: "POST",
                url: getSecurityServiceUrl(),
                headers: { "SOAPAction": "GetTokenRequest", "Content-Type": "text/xml" },
                data: templateGetToken.replace('{0}', username).replace('{1}', password),
                success: tryAuthenticateSuccess,
                error: tryAuthenticateFailure,
            });
        }

    };

    timelog.isTokenValid = function() {
        return new Date(timelog.getToken().Expires) > new Date();
    }

    timelog.signOut = function () {

        if (timelog.debug) { console.log('[timelog.signOut] Executing'); }

        tokenInitials = '';
        tokenTimestamp = '';
        tokenHash = '';

        if (timelog.enableLocalStorageCache) {
            localStorage.removeItem(_localStoragePasswordKey);
            localStorage.removeItem(_localStorageTokenKey);
        }

    }

    function tryAuthenticateSuccess(data) {
        var result = x2js.xml_str2json(new XMLSerializer().serializeToString(data)).Envelope.Body.GetTokenResponse.GetTokenResult;
        if (result.ResponseState.__text == "Success") {

            if (timelog.debug) { console.log('[timelog.tryAuthenticateSuccess] Token obtained'); }

            tokenInitials = result.Return.SecurityToken.Initials;
            tokenExpires = result.Return.SecurityToken.Expires;
            tokenHash = result.Return.SecurityToken.Hash;

            if (timelog.enableLocalStorageCache) {
                localStorage.setItem(_localStorageTokenKey, x2js.json2xml_str(result.Return));
            }

            if (timelog.authenticateSuccessCallback != undefined) {
                timelog.authenticateSuccessCallback();
            }

        } else {

            var errorMsg = result.Messages.APIMessage[0].Message.toString().substring(result.Messages.APIMessage[0].Message.toString().indexOf('\''));
            if (timelog.debug) { console.log('[timelog.tryAuthenticateSuccess] Token failed (' + errorMsg + ')'); }

            if (timelog.enableLocalStorageCache) {
                localStorage.removeItem(_localStoragePasswordKey);
                localStorage.removeItem(_localStorageTokenKey);
            }

            if (timelog.authenticateFailureCallback != undefined) {
                timelog.authenticateFailureCallback(errorMsg);
            }

        }
    }

    function tryAuthenticateFailure(jqhxr, textstatus, errrorthrown) {

        if (timelog.debug) { console.log('[timelog.tryAuthenticateFailure] Token failed (' + textStatus + ')'); }

        tokenInitials = '';
        tokenTimestamp = '';
        tokenHash = '';

        if (timelog.enableLocalStorageCache) {
            localStorage.removeItem(_localStoragePasswordKey);
            localStorage.removeItem(_localStorageTokenKey);
        }

        if (tryAuthenticateFailureCallback != undefined) {
            var errorMsg = textstatus;
            tryAuthenticateFailureCallback(errorMsg);
        }

    }

    /* TASKS
    ********************************************************/
    var taskList = undefined;
    var getTasksAllocatedToEmployeeRunning = false;

    timelog.getTasksAllocatedToEmployeeSuccessCallback = undefined;
    timelog.getTasksAllocatedToEmployeeFailureCallback = undefined;
    timelog.getTasksAllocatedToEmployee = function() {

		if (taskList != undefined) {
			getTasksAllocatedToEmployeeSuccess('');
			return;
		}

		if (getTasksAllocatedToEmployeeRunning) {
            if (timelog.debug) { console.log('[timelog.getTasksAllocatedToEmployee] Already running skipping...')}
		    return;
		}

		getTasksAllocatedToEmployeeRunning = true;

        if (timelog.debug) { console.log('[timelog.getTasksAllocatedToEmployee] Executing'); }

        $.ajax({
            type: "POST",
            url: getProjectManagementServiceUrl(),
            headers: { "SOAPAction": "GetTasksAllocatedToEmployeeRequest", "Content-Type": "text/xml" },
            data: templateGetTasksAllocated.replace('{0}', timelog.getToken().Initials).
                                            replace('{1}', timelog.getToken().Initials).
                                            replace('{2}', timelog.getToken().Expires).
                                            replace('{3}', timelog.getToken().Hash),
            success: getTasksAllocatedToEmployeeSuccess,
            error: getTasksAllocatedToEmployeeFailure,
        });

    }

    function getTasksAllocatedToEmployeeSuccess(data) {

        getTasksAllocatedToEmployeeRunning = false;

		if (data == '') {
			if (timelog.getTasksAllocatedToEmployeeSuccessCallback != undefined) {
				// if (timelog.debug) { console.log('[timelog.getTasksAllocatedToEmployeeSuccess] Data returned from cache'); }
				timelog.getTasksAllocatedToEmployeeSuccessCallback(taskList);
				return;
            }
		}

		var result = x2js.xml_str2json(new XMLSerializer().serializeToString(data)).Envelope.Body.GetTasksAllocatedToEmployeeResponse.GetTasksAllocatedToEmployeeResult;
        if (result.ResponseState.__text == "Success") {
            if (timelog.debug) { console.log('[timelog.getTasksAllocatedToEmployeeSuccess] Data downloaded'); }
            if (timelog.enableLocalStorageCache) {
                //localStorage.setItem(_localStorageTokenKey, x2js.json2xml_str(result.Return));
            }

			taskList = result.Return.Task;
            if (timelog.getTasksAllocatedToEmployeeSuccessCallback != undefined) {
                timelog.getTasksAllocatedToEmployeeSuccessCallback(result.Return.Task);
            }
        } else {
            var errorMsg = result.Messages.APIMessage[0].Message.toString().substring(result.Messages.APIMessage[0].Message.toString().indexOf('\''));
            if (timelog.debug) { console.log('[timelog.getTasksAllocatedToEmployeeSuccess] Failed (' + errorMsg + ')'); }
            if (timelog.enableLocalStorageCache) {
                //localStorage.removeItem(_localStoragePasswordKey);
                //localStorage.removeItem(_localStorageTokenKey);
            }

            if (timelog.getTasksAllocatedToEmployeeFailureCallback != undefined) {
                timelog.getTasksAllocatedToEmployeeFailureCallback(errorMsg);
			}
        }
    }

    function getTasksAllocatedToEmployeeFailure(jqhxr, textstatus, errrorthrown) {

        getTasksAllocatedToEmployeeRunning = false;

        if (timelog.debug) { console.log('[timelog.getTasksAllocatedToEmployeeFailure] Failed (' + textStatus + ')'); }

    }

}(window.timelog = window.timelog || {}, jQuery));