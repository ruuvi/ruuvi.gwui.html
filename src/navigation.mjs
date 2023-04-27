import $ from 'jquery'

class Navigation {
  static #change_url (url) {
    if (window.location.hash === ('#' + url)) {
      return
    }
    window.location.hash = url
  }

  static change_page_to_network_type () {
    this.#change_url('page-network_type')
  }

  static change_page_to_wifi_connection () {
    this.#change_url('page-wifi_connection')
  }

  static change_page_to_ethernet_connection () {
    this.#change_url('page-ethernet_connection')
  }

  static change_page_to_software_update () {
    // bodyClassLoadingRemove()
    // TODO: enable bodyClassLoadingRemove
    this.#change_url('page-software_update')
  }

  static change_page_to_remote_cfg () {
    this.#change_url('page-remote_cfg')
  }

  static change_page_to_update_schedule () {
    this.#change_url('page-update_schedule')
  }

  static change_url_software_update_progress () {
    this.#change_url('page-software_update_progress')
  }

  static change_page_to_settings_lan_auth () {
    this.#change_url('page-settings_lan_auth')
  }

  static change_url_ntp_config () {
    this.#change_url('page-ntp_config')
  }

  static change_url_cloud_options () {
    this.#change_url('page-cloud_options')
  }

  static change_url_custom_server () {
    this.#change_url('page-custom_server')
  }

  static change_url_scanning () {
    this.#change_url('page-scanning')
  }

  static change_page_to_finished (num_steps) {
    let h = ''
    h += '<ul class="progressbar">'
    for (let i = 0; i < num_steps; ++i) {
      h += '<li class="active"></li>'
    }
    h += '</ul>'
    $('section#page-finished div.progressbar-container').html(h)
    this.#change_url('page-finished')
  }

}

export default Navigation
