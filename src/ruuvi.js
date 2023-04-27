'use strict'

import $ from 'jquery'
import logger from './logger.mjs'
import createAuth from './auth.mjs'
import PageAuth from './page_auth.mjs'
import AppInfo from './app_info.mjs'
import WindowLocation from './window_location.mjs'
import createGwCfg from './gw_cfg.mjs'
import { PageWelcome } from './page_welcome.mjs'

import './scss/style.scss'
import { PageNetworkType } from './page_network_type.mjs'
import { PageEthernetConnection } from './page_ethernet_connection.mjs'
import GwStatus from './gw_status.mjs'
import { PageWiFiConnection } from './page_wifi_connection.mjs'
import PageSoftwareUpdate from './page_software_update.mjs'
import PageSoftwareUpdateProgress from './page_software_update_progress.mjs'
import PageRemoteCfg from './page_remote_cfg.mjs'
import PageUpdateSchedule from './page_update_schedule.mjs'
import PageLanAuth from './page_lan_auth.mjs'
import PageCloudOptions from './page_cloud_options.mjs'
import PageCustomServer from './page_custom_server.mjs'
import PageTimeSync from './page_time_sync.mjs'
import PageScanning from './page_scanning.mjs'
import PageFinished from './page_finished.mjs'
import { log_wrap } from './utils.mjs'

let g_auth
let g_gw_cfg
let g_current_page = null
let g_pages

function initialize () {

  window.onpopstate = function (event) {
    console.log(log_wrap('window.onpopstate: ' + document.location.hash + ', current_page: ' + g_current_page))
    console.log(log_wrap(`cur hash: ${$(location).attr('hash')}`))
    let url = window.location.hash.substring(1)
    if (url.startsWith('popup-')) {
      return
    }
    if (g_current_page) {
      $(g_current_page).hide()
      $(g_current_page).trigger('onHide')
    }
    g_current_page = '#' + url
    $(g_current_page).show()
    $(g_current_page).trigger('onShow')

    if (document.location.hash === '#page-finished') {
      // Prevent the user from leaving this page by pressing the Back button
      window.history.pushState(null, '', '#page-finished')
    }
  }

  window.addEventListener('online', function (event) {
    console.log(log_wrap('Became online, is_online=' + window.navigator.onLine))
  }, false)

  window.addEventListener('offline', function (event) {
    console.log(log_wrap('Became offline, is_online=' + window.navigator.onLine))
  }, false)

  function on_switch_language (lang) {
    $('p[lang], span[lang]').each(function () {
      if ($(this).attr('lang') === lang)
        $(this).fadeIn()
      else
        $(this).hide()
      if (lang === 'en') {
        $('input#mqtt_client_id').attr('placeholder', 'MAC-address is used if empty')
      } else if (lang === 'fi') {
        $('input#mqtt_client_id').attr('placeholder', 'MAC-osoitetta käytetään, jos se on tyhjä')
      }
    })
  }

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
}

class Pages {
  page_welcome
  page_network_type
  page_ethernet_connection
  page_wifi_connection
  page_software_update
  page_software_update_progress
  page_remote_cfg
  page_update_schedule
  page_lan_auth
  page_cloud_options
  page_custom_server
  page_time_sync
  page_scanning
  page_finished

  /**
   * @param {GwCfg} gw_cfg
   * @param {Auth} auth
   * @param {boolean} flagAccessFromLAN
   */
  constructor (gw_cfg, auth, flagAccessFromLAN) {
    this.page_welcome = new PageWelcome()
    this.page_network_type = new PageNetworkType(flagAccessFromLAN, gw_cfg.eth)
    this.page_ethernet_connection = new PageEthernetConnection(gw_cfg, auth)
    this.page_wifi_connection = new PageWiFiConnection(gw_cfg, auth)
    this.page_software_update = new PageSoftwareUpdate(gw_cfg.info.fw_ver)
    this.page_software_update_progress = new PageSoftwareUpdateProgress()
    this.page_remote_cfg = new PageRemoteCfg(gw_cfg, auth)
    this.page_update_schedule = new PageUpdateSchedule(gw_cfg.auto_update)
    this.page_lan_auth = new PageLanAuth(gw_cfg.lan_auth)
    this.page_cloud_options = new PageCloudOptions(gw_cfg)
    this.page_custom_server = new PageCustomServer(gw_cfg, auth)
    this.page_time_sync = new PageTimeSync(gw_cfg.ntp)
    this.page_scanning = new PageScanning(gw_cfg)
    this.page_finished = new PageFinished(gw_cfg, auth)
  }

}

async function on_authenticate (result) {
  if (result) {
    logger.info(`on authenticate: ok`)
    try {
      await g_gw_cfg.fetch()
      g_pages = new Pages(g_gw_cfg, g_auth, g_auth.flagAccessFromLAN)
      console.log(log_wrap('Start periodic status check'))
      // TODO: update all pages with data from gw_cfg
      GwStatus.startCheckingStatus()
    } catch (error) {
      alert(error)
    }
  } else {
    logger.info(`on authenticate: denied`)
  }
}

function on_load () {
  logger.info('ruuvi.js: Loaded')

  initialize()
  g_gw_cfg = createGwCfg()
  g_auth = createAuth(window.location.hash, new PageAuth(), new AppInfo(), new WindowLocation(window.location))
  g_auth.waitAuth()
      .then(async (result) => on_authenticate(result),
          (error) => {
            logger.info(`on load: waitAuth error: ${error}`)
          })
      .catch((error) => {
        logger.info(`on load: waitAuth exception: ${error}`)
      })
}

$(window).on('load', function () {
  on_load()
})
