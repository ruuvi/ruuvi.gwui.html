import $ from 'jquery'
import { log_wrap } from './utils.mjs'
import GuiSectAdvanced from './gui_sect_advanced.mjs'
import GuiRadioButton from './gui_radio_button.mjs'
import GuiCheckbox from './gui_checkbox.mjs'
import GuiSelect from './gui_select.mjs'
import GuiButtonContinue from './gui_button_continue.mjs'
import GuiButtonBack from './gui_button_back.mjs'
import Navigation from './navigation.mjs'
import GuiDiv from './gui_div.mjs'

class PageUpdateSchedule {
  /** @type GwCfgAutoUpdate */
  #gwCfgAutoUpdate

  #section = $('section#page-update_schedule')
  #sect_advanced = new GuiSectAdvanced($('#page-update_schedule-advanced-button'))
  #radio_auto_update_cycle = new GuiRadioButton('auto_update_cycle')
  /** @type GuiRadioButtonOption */
  #radio_auto_update_cycle_regular
  /** @type GuiRadioButtonOption */
  #radio_auto_update_cycle_beta
  /** @type GuiRadioButtonOption */
  #radio_auto_update_cycle_manual
  #checkbox_weekday_monday = new GuiCheckbox($('#conf-auto_update_schedule-button-monday'))
  #checkbox_weekday_tuesday = new GuiCheckbox($('#conf-auto_update_schedule-button-tuesday'))
  #checkbox_weekday_wednesday = new GuiCheckbox($('#conf-auto_update_schedule-button-wednesday'))
  #checkbox_weekday_thursday = new GuiCheckbox($('#conf-auto_update_schedule-button-thursday'))
  #checkbox_weekday_friday = new GuiCheckbox($('#conf-auto_update_schedule-button-friday'))
  #checkbox_weekday_saturday = new GuiCheckbox($('#conf-auto_update_schedule-button-saturday'))
  #checkbox_weekday_sunday = new GuiCheckbox($('#conf-auto_update_schedule-button-sunday'))
  #select_period_from = new GuiSelect($('#conf-auto_update_schedule-period_from'))
  #select_period_to = new GuiSelect($('#conf-auto_update_schedule-period_to'))
  #select_tz = new GuiSelect($('#conf-auto_update_schedule-tz'))
  #div_schedule_options = new GuiDiv($('#conf-auto_update_schedule'))
  #button_continue = new GuiButtonContinue($('#page-update_schedule-button-continue'))
  #button_back = new GuiButtonBack($('#page-update_schedule-button-back'))

  /**
   * @param {GwCfgAutoUpdate} gwCfgAutoUpdate
   */
  constructor (gwCfgAutoUpdate) {
    this.#gwCfgAutoUpdate = gwCfgAutoUpdate

    this.#section.bind('onShow', () => this.#onShow())
    this.#section.bind('onHide', () => this.#onHide())

    this.#radio_auto_update_cycle_regular = this.#radio_auto_update_cycle.addOption('auto_update_cycle-regular',
        this.#gwCfgAutoUpdate.auto_update_cycle.isRegular())
    this.#radio_auto_update_cycle_beta = this.#radio_auto_update_cycle.addOption('auto_update_cycle-beta',
        this.#gwCfgAutoUpdate.auto_update_cycle.isBetaTester())
    this.#radio_auto_update_cycle_manual = this.#radio_auto_update_cycle.addOption('auto_update_cycle-manual',
        this.#gwCfgAutoUpdate.auto_update_cycle.isManual())

    this.#radio_auto_update_cycle_regular.on_click(() => this.#onChangeAutoUpdateCycle())
    this.#radio_auto_update_cycle_beta.on_click(() => this.#onChangeAutoUpdateCycle())
    this.#radio_auto_update_cycle_manual.on_click(() => this.#onChangeAutoUpdateCycle())

    this.#checkbox_weekday_sunday.on_change(() => this.#onChangeWeekdays())
    this.#checkbox_weekday_monday.on_change(() => this.#onChangeWeekdays())
    this.#checkbox_weekday_tuesday.on_change(() => this.#onChangeWeekdays())
    this.#checkbox_weekday_wednesday.on_change(() => this.#onChangeWeekdays())
    this.#checkbox_weekday_thursday.on_change(() => this.#onChangeWeekdays())
    this.#checkbox_weekday_friday.on_change(() => this.#onChangeWeekdays())
    this.#checkbox_weekday_sunday.on_change(() => this.#onChangeWeekdays())

    this.#select_period_from.on_change(() => this.#onChangePeriodFrom())
    this.#select_period_to.on_change(() => this.#onChangePeriodTo())
    this.#select_tz.on_change(() => this.#onChangeTZ())

    this.#button_continue.on_click(() => Navigation.change_page_to_settings_lan_auth())
  }

  #onShow () {
    console.log(log_wrap('section#page-update_schedule: onShow'))
    const weekdays_bitmask = this.#gwCfgAutoUpdate.auto_update_weekdays_bitmask

    $('section#page-update_schedule div.btn-dropdown-arrow-up').hide()
    $('section#page-update_schedule div.btn-dropdown-arrow-down').show()
    if (!this.#gwCfgAutoUpdate.auto_update_cycle.isRegular() ||
        weekdays_bitmask !== 0x7F ||
        this.#select_period_from.getSelectedVal() !== '0' ||
        this.#select_period_to.getSelectedVal() !== '24') {
      this.#sect_advanced.show()
    } else {
      this.#sect_advanced.hide()
    }

    this.#radio_auto_update_cycle_regular.setState(this.#gwCfgAutoUpdate.auto_update_cycle.isRegular())
    this.#radio_auto_update_cycle_beta.setState(this.#gwCfgAutoUpdate.auto_update_cycle.isBetaTester())
    this.#radio_auto_update_cycle_manual.setState(this.#gwCfgAutoUpdate.auto_update_cycle.isManual())

    this.#checkbox_weekday_sunday.setState((weekdays_bitmask & 0x01) !== 0)
    this.#checkbox_weekday_monday.setState((weekdays_bitmask & 0x02) !== 0)
    this.#checkbox_weekday_tuesday.setState((weekdays_bitmask & 0x04) !== 0)
    this.#checkbox_weekday_wednesday.setState((weekdays_bitmask & 0x08) !== 0)
    this.#checkbox_weekday_thursday.setState((weekdays_bitmask & 0x10) !== 0)
    this.#checkbox_weekday_friday.setState((weekdays_bitmask & 0x20) !== 0)
    this.#checkbox_weekday_saturday.setState((weekdays_bitmask & 0x40) !== 0)

    this.#select_period_from.setSelectedVal(`${this.#gwCfgAutoUpdate.auto_update_interval_from}`)
    this.#select_period_to.setSelectedVal(`${this.#gwCfgAutoUpdate.auto_update_interval_to}`)
    this.#select_tz.setSelectedVal(`${this.#gwCfgAutoUpdate.auto_update_tz_offset_hours}`)

    this.#on_auto_update_cycle_changed()
    this.#on_edit_automatic_update_settings()
  }

  #onHide () {
    console.log(log_wrap('section#page-update_schedule: onHide'))

    if (this.#radio_auto_update_cycle_regular.isChecked()) {
      this.#gwCfgAutoUpdate.auto_update_cycle.setRegular()
    } else if (this.#radio_auto_update_cycle_beta.isChecked()) {
      this.#gwCfgAutoUpdate.auto_update_cycle.setBetaTester()
    } else if (this.#radio_auto_update_cycle_manual.isChecked()) {
      this.#gwCfgAutoUpdate.auto_update_cycle.setManual()
    } else {
      this.#gwCfgAutoUpdate.auto_update_cycle.setRegular()
    }

    this.#gwCfgAutoUpdate.auto_update_weekdays_bitmask = this.#get_weekdays_bitmask()

    this.#gwCfgAutoUpdate.auto_update_interval_from = parseInt(this.#select_period_from.getSelectedVal())
    this.#gwCfgAutoUpdate.auto_update_interval_to = parseInt(this.#select_period_to.getSelectedVal())
    this.#gwCfgAutoUpdate.auto_update_tz_offset_hours = parseInt(this.#select_tz.getSelectedVal())
  }

  #onChangeAutoUpdateCycle () {
    this.#on_auto_update_cycle_changed()
    this.#on_edit_automatic_update_settings()
  }

  #onChangeWeekdays () {
    this.#on_edit_automatic_update_settings()
  }

  #onChangePeriodFrom () {
    const auto_update_interval_from = parseInt(this.#select_period_from.getSelectedVal())
    const auto_update_interval_to = parseInt(this.#select_period_to.getSelectedVal())
    if (auto_update_interval_from >= auto_update_interval_to) {
      this.#select_period_to.setSelectedVal(auto_update_interval_from + 1)
    }
  }

  #onChangePeriodTo () {
    const auto_update_interval_from = parseInt(this.#select_period_from.getSelectedVal())
    const auto_update_interval_to = parseInt(this.#select_period_to.getSelectedVal())
    if (auto_update_interval_from >= auto_update_interval_to) {
      this.#select_period_from.setSelectedVal(auto_update_interval_to - 1)
    }
  }

  #onChangeTZ () {
  }

  #on_auto_update_cycle_changed () {
    if (this.#radio_auto_update_cycle_regular.isChecked()) {
      this.#div_schedule_options.slideDown()
    } else if (this.#radio_auto_update_cycle_beta.isChecked()) {
      this.#div_schedule_options.slideDown()
    } else if (this.#radio_auto_update_cycle_manual.isChecked()) {
      this.#div_schedule_options.slideUp()
    } else {
      this.#radio_auto_update_cycle_regular.setChecked()
      this.#div_schedule_options.slideDown()
    }
  }

  #get_weekdays_bitmask () {
    let weekdays_bitmask = 0
    if (this.#checkbox_weekday_sunday.isChecked()) {
      weekdays_bitmask |= 0x01
    }
    if (this.#checkbox_weekday_monday.isChecked()) {
      weekdays_bitmask |= 0x02
    }
    if (this.#checkbox_weekday_tuesday.isChecked()) {
      weekdays_bitmask |= 0x04
    }
    if (this.#checkbox_weekday_wednesday.isChecked()) {
      weekdays_bitmask |= 0x08
    }
    if (this.#checkbox_weekday_thursday.isChecked()) {
      weekdays_bitmask |= 0x10
    }
    if (this.#checkbox_weekday_friday.isChecked()) {
      weekdays_bitmask |= 0x20
    }
    if (this.#checkbox_weekday_saturday.isChecked()) {
      weekdays_bitmask |= 0x40
    }
    return weekdays_bitmask
  }

  #on_edit_automatic_update_settings () {
    if (this.#radio_auto_update_cycle_manual.isChecked()) {
      this.#button_continue.enable()
    } else {
      let flag_button_continue_enabled = true

      if (this.#get_weekdays_bitmask() === 0) {
        flag_button_continue_enabled = false
      }

      if (flag_button_continue_enabled) {
        this.#button_continue.enable()
      } else {
        this.#button_continue.disable()
      }
    }
  }
}

export default PageUpdateSchedule
