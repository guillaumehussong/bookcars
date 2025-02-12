import React, { useState, useEffect } from 'react'
import { StyleSheet, View, Pressable, Text, Platform } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import DateTimePickerModal from 'react-native-modal-datetime-picker'
import { format } from 'date-fns'
import { enUS, fr, es } from 'date-fns/locale'
import { MaterialIcons } from '@expo/vector-icons'
import * as bookcarsHelper from ':bookcars-helper'

interface DateTimePickerProps {
  value?: Date
  locale?: string
  mode?: 'date' | 'datetime' | 'time'
  size?: 'small'
  label: string
  backgroundColor?: string
  error?: boolean
  style?: object
  helperText?: string
  minDate?: Date
  maxDate?: Date
  readOnly?: boolean
  hideClearButton?: boolean
  onPress?: () => void
  onChange?: (date: Date | undefined) => void
}

const CustomDateTimePicker = ({
  value: dateTimeValue,
  locale: dateTimeLocale,
  mode = 'date',
  size,
  label: dateTimeLabel,
  backgroundColor,
  error,
  style,
  helperText,
  minDate,
  maxDate,
  readOnly,
  hideClearButton,
  onPress,
  onChange
}: DateTimePickerProps) => {
  const [label, setLabel] = useState('')
  const [value, setValue] = useState<Date | undefined>(dateTimeValue)
  const [show, setShow] = useState(false)
  const [locale, setLocale] = useState(dateTimeLocale === 'fr' ? fr : dateTimeLocale === 'es' ? es : enUS)
  const _format = mode === 'date' ? 'eeee, d LLLL yyyy' : 'kk:mm'
  const now = new Date()
  const small = size === 'small'

  useEffect(() => {
    setLocale(dateTimeLocale === 'fr' ? fr : dateTimeLocale === 'es' ? es : enUS)
    setLabel((value && bookcarsHelper.capitalize(format(value, _format, { locale }))) || dateTimeLabel)
  }, [dateTimeLocale])

  useEffect(() => {
    setValue(dateTimeValue)
    setLabel((dateTimeValue && bookcarsHelper.capitalize(format(dateTimeValue, _format, { locale }))) || dateTimeLabel)
  }, [dateTimeValue])

  return (
    <View style={{ ...style, ...styles.container }}>
      {value && <Text style={styles.label}>{dateTimeLabel}</Text>}
      <View style={styles.dateContainer}>
        <Pressable
          style={styles.dateButton}
          onPress={() => {
            setShow(true)
            if (onPress) {
              onPress()
            }
          }}
        >
          <Text
            style={{
              ...styles.dateText,
              color: value ? 'rgba(0, 0, 0, 0.87)' : '#a3a3a3',
            }}
          >
            {label}
          </Text>
          {!readOnly && value !== undefined && !hideClearButton && (
            <MaterialIcons
              style={styles.clear}
              name="clear"
              size={22}
              color="rgba(0, 0, 0, 0.28)"
              onPress={() => {
                setLabel(dateTimeLabel)
                setValue(undefined)
                if (onChange) {
                  onChange(undefined)
                }
              }}
            />
          )}
        </Pressable>

        {/* Android Picker */}
        {Platform.OS === 'android' && show && (
          <DateTimePicker
            mode={mode}
            value={value || now}
            minimumDate={minDate}
            maximumDate={maxDate}
            onChange={(event, date) => {
              setShow(false)
              if (event.type === 'set' && date) {
                setValue(date)
                if (onChange) {
                  onChange(date)
                }
              }
            }}
          />
        )}

        {/* iOS Modal Picker */}
        {Platform.OS === 'ios' && (
          <DateTimePickerModal
            isVisible={show}
            mode={mode}
            date={value || now}
            minimumDate={minDate}
            maximumDate={maxDate}
            onConfirm={(date) => {
              setShow(false)
              setValue(date)
              if (onChange) {
                onChange(date)
              }
            }}
            onCancel={() => setShow(false)}
          />
        )}

        {helperText && <Text style={styles.helperText}>{helperText}</Text>}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    maxWidth: 480,
  },
  label: {
    backgroundColor: '#F5F5F5',
    color: 'rgba(0, 0, 0, 0.6)',
    fontSize: 12,
    fontWeight: '400',
    paddingRight: 5,
    paddingLeft: 5,
    marginLeft: 15,
    position: 'absolute',
    top: -10,
    zIndex: 1,
  },
  dateContainer: {
    alignSelf: 'stretch',
    height: 55,
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 10,
    borderColor: 'rgba(0, 0, 0, 0.23)',
    backgroundColor: '#F5F5F5',
  },
  dateButton: {
    height: 55,
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    paddingTop: 15,
    paddingRight: 15,
    paddingBottom: 15,
    paddingLeft: 15,
  },
  helperText: {
    color: 'rgba(0, 0, 0, 0.23)',
    fontSize: 12,
    fontWeight: '400',
    paddingLeft: 5,
  },
  clear: {
    position: 'absolute',
    right: 10,
    top: 17,
  },
})

export default CustomDateTimePicker
