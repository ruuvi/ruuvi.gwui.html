'use strict'

import $ from 'jquery'
import crypto from './crypto'

let g_realm = null
let g_challenge = null
let g_session_cookie = null
let g_session_id = null

function on_switch_language (lang) {
  $('p[lang], span[lang]').each(function () {
    if ($(this).attr('lang') === lang)
      $(this).fadeIn()
    else
      $(this).hide()
  })
}

$(document).ready(function () {
  checkAuth()

  $('.input-password-eye').click(function (e) {
    if ($(this).hasClass('disabled')) {
      return
    }
    let password_field = $(this).parent().children('input')
    const flag_hidden = password_field.attr('type') === 'password'
    if (flag_hidden) {
      $(this).children('.eye').addClass('hidden')
      $(this).children('.eye-slash').removeClass('hidden')
      password_field.attr('type', 'text')
    } else {
      $(this).children('.eye-slash').addClass('hidden')
      $(this).children('.eye').removeClass('hidden')
      password_field.attr('type', 'password')
    }
  })

  $('#language-switcher-en').click(function (e) {
    $('div#language-switcher > ul > li > a').removeClass('language-switcher-active')
    $(this).addClass('language-switcher-active')
    on_switch_language('en')
  })

  $('#language-switcher-fi').click(function (e) {
    $('div#language-switcher > ul > li > a').removeClass('language-switcher-active')
    $(this).addClass('language-switcher-active')
    on_switch_language('fi')
  })

  $('#lan_auth-button-login').click(function (e) {
    e.preventDefault()
    performLogIn($('#lan_auth-user').val(), $('#lan_auth-pass').val())
  })

  $('#lan_auth-button-home').click(function (e) {
    e.preventDefault()
    window.location.replace('/')
  })

  function _parseToken (auth_str, prefix, suffix) {
    let idx1 = auth_str.indexOf(prefix)
    if (idx1 === -1) {
      return null
    }
    idx1 += prefix.length
    let idx2 = auth_str.indexOf(suffix, idx1)
    if (idx2 === -1) {
      return null
    }
    return auth_str.substr(idx1, idx2 - idx1)
  }

  function _handleHeaderWwwAuth (auth_str) {
    // x-ruuvi-interactive realm="RuuviGatewayEEFF" challenge="03601dc11c92170713b68d4bfe430899b61c3df9c2559a9b7bce70ab451d9ade" session_cookie="RUUVISESSION" session_id="CXOHVRWYOIPHMKMV"
    if (!auth_str) {
      return
    }
    if (!auth_str.startsWith('x-ruuvi-interactive ')) {
      return
    }
    let realm = _parseToken(auth_str, 'realm="', '"')
    if (!realm) {
      return
    }
    let challenge = _parseToken(auth_str, 'challenge="', '"')
    if (!challenge) {
      return
    }
    let session_cookie = _parseToken(auth_str, 'session_cookie="', '"')
    if (!session_cookie) {
      return
    }
    let session_id = _parseToken(auth_str, 'session_id="', '"')
    if (!session_id) {
      return
    }
    g_realm = realm
    g_challenge = challenge
    g_session_cookie = session_cookie
    g_session_id = session_id
  }

  function updateLanAuthType (lan_auth_type, flag_show_auth_default) {
    if (lan_auth_type === 'lan_auth_default') {
      $('#lan_auth-user').val('Admin')
      $('#lan_auth-user').prop('disabled', true)
      if (flag_show_auth_default) {
        $('#auth-default').show()
      } else {
        $('#auth-default').hide()
      }
    } else {
      $('#auth-default').hide()
    }
  }

  function checkAuth () {
    $.ajax({
        url: '/auth',
        accept: 'application/json, text/plain, */*',
        method: 'GET',
        dataType: 'json',
        cache: false,
        headers: null,
        success: function (data, text) {
          $('#lan_auth-user_login').hide()
          $('#lan_auth-home').show()
          $('#auth-yes').show()
          $('#auth-forbidden').hide()
          $('#gateway_name').text(data.gateway_name)
          updateLanAuthType(data.lan_auth_type, false)
        },
        error: function (request, status, error) {
          if (request.status === 401) {
            $('#auth-yes').hide()
            $('#auth-forbidden').hide()
            $('#auth-denied').hide()
            $('#auth-reconfigure').hide()
            $('#lan_auth-user_login').show()
            _handleHeaderWwwAuth(request.getResponseHeader('WWW-Authenticate'))
            $('#gateway_name').text(request.responseJSON.gateway_name)
            updateLanAuthType(request.responseJSON.lan_auth_type, true)
          } else if (request.status === 403) {
            $('#auth-yes').hide()
            $('#lan_auth-user_login').hide()
            $('#gateway_name').text(request.responseJSON.gateway_name)
            if (request.responseJSON.lan_auth_type === 'lan_auth_deny') {
              $('#auth-denied').show()
            } else {
              $('#auth-forbidden').show()
            }
            $('#auth-reconfigure').show()
            updateLanAuthType(request.responseJSON.lan_auth_type, true)
          } else {
            $('#auth-yes').hide()
            $('#lan_auth-user_login').hide()
          }
        }
      }
    )
  }

  function performLogIn (user, password) {
    $('#auth-err-message').hide()
    let encrypted_password = CryptoJS.MD5(user + ':' + g_realm + ':' + password).toString()
    let password_sha256 = CryptoJS.SHA256(g_challenge + ':' + encrypted_password).toString()
    $.ajax({
        url: '/auth',
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        method: 'POST',
        cache: false,
        headers: null,
        data: JSON.stringify({
          'login': user,
          'password': password_sha256
        }),
        success: function (data, text, request) {
          $('#lan_auth-user_login').hide()
          $('#lan_auth-home').show()
          $('#auth-yes').show()
          $('#gateway_name').text(data.gateway_name)
          updateLanAuthType(data.lan_auth_type, false)
          let prev_url = request.getResponseHeader('Ruuvi-prev-url')
          if (prev_url) {
            window.location.replace(prev_url)
          }
        },
        error: function (request, status, error) {
          if (request.status === 401) {
            $('#auth-yes').hide()
            $('#lan_auth-user_login').show()
            _handleHeaderWwwAuth(request.getResponseHeader('WWW-Authenticate'))
            $('#auth-err-message').show()
            $('#gateway_name').text(request.responseJSON.gateway_name)
            updateLanAuthType(request.responseJSON.lan_auth_type, true)
          } else {
            $('#auth-yes').hide()
            $('#lan_auth-user_login').hide()
          }
        }
      }
    )
  }
})
