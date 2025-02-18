import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation, DrawerActions, RouteProp } from '@react-navigation/native'
import { Avatar, Badge, Menu } from 'react-native-paper'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as bookcarsHelper from ':bookcars-helper'

import * as UserService from '@/services/UserService'
import * as env from '@/config/env.config'
import { useGlobalContext, GlobalContextType } from '@/context/GlobalContext'
import * as NotificationService from '@/services/NotificationService'
import CurrencyMenu from '@/components/CurrencyMenu'
import i18n from '@/lang/i18n'
import * as helper from '@/common/helper'
import type { UpdateLanguagePayload } from ':bookcars-types'

interface HeaderProps {
  route?: RouteProp<StackParams, keyof StackParams>,
  title?: string
  hideTitle?: boolean
  loggedIn?: boolean
  reload?: boolean
  _avatar?: string | null
}

const Header = ({
  route,
  title,
  hideTitle,
  loggedIn,
  reload,
  _avatar
}: HeaderProps) => {
  const navigation = useNavigation<NativeStackNavigationProp<StackParams, keyof StackParams>>()
  const { notificationCount, setNotificationCount } = useGlobalContext() as GlobalContextType

  const [avatar, setAvatar] = useState<string | null | undefined>(null)
  const [language, setLanguage] = useState(env.DEFAULT_LANGUAGE)
  const [openLanguageMenu, setOpenLanguageMenu] = useState(false)

  useEffect(() => {
    const init = async () => {
      const currentUser = await UserService.getCurrentUser()
      if (currentUser && currentUser._id) {
        const user = await UserService.getUser(currentUser._id)

        if (user.avatar) {
          setAvatar(bookcarsHelper.joinURL(env.CDN_USERS, user.avatar))
        } else {
          setAvatar('')
        }

        const notificationCounter = await NotificationService.getNotificationCounter(currentUser._id)
        setNotificationCount(notificationCounter.count)
      }
      const userLanguage = await UserService.getLanguage()
      setLanguage(userLanguage)
    }

    if (reload) {
      init()
    }
  }, [reload, setNotificationCount])

  useEffect(() => {
    setAvatar(_avatar)
  }, [_avatar])

  const updateLanguage = async (_language: string) => {
    try {
      const setLang = async (__language: string) => {
        i18n.locale = __language
        await UserService.setLanguage(__language)
        setLanguage(__language)
        if (route) {
          helper.navigate(route, navigation, true)
        }
      }

      const currentUser = await UserService.getCurrentUser()
      if (currentUser && currentUser._id) {
        const data: UpdateLanguagePayload = {
          id: currentUser._id,
          language: _language,
        }
        const status = await UserService.updateLanguage(data)

        if (status === 200) {
          await setLang(_language)
        } else {
          helper.error()
        }
      } else {
        await setLang(_language)
      }
    } catch (err) {
      helper.error(err)
    }
  }

  return route && (
    <View style={styles.container}>
      <Menu
        visible={openLanguageMenu}
        onDismiss={() => setOpenLanguageMenu(false)}
        anchor={
          <Pressable hitSlop={15} style={styles.menu} onPress={() => setOpenLanguageMenu(true)}>
            <MaterialIcons name="language" size={24} color="#fff" />
          </Pressable>
        }
        contentStyle={styles.languageMenu}
      >
        {env.LANGUAGES.map((lang, index) => (
          <Menu.Item
            key={`lang-${lang.code}-${index}`}
            onPress={async () => {
              if (lang.code !== language) {
                await updateLanguage(lang.code)
                setOpenLanguageMenu(false)
              }
            }}
            title={lang.label}
            style={lang.code === language ? styles.selectedLanguageItem : styles.languageItem}
            titleStyle={lang.code === language ? styles.selectedLanguageText : styles.languageText}
          />
        ))}
      </Menu>

      {!hideTitle && (
        <View>
          <Text style={styles.text}>{title}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <CurrencyMenu
          route={route}
          textColor="#fff"
          style={styles.currency}
        />

        {loggedIn && (
          <>
            <Pressable style={styles.notifications} onPress={() => navigation.navigate('Notifications', {})}>
              {notificationCount > 0 && (
                <Badge style={styles.badge} size={18}>
                  {notificationCount}
                </Badge>
              )}
              <MaterialIcons name="notifications" size={24} color="#fff" style={styles.badgeIcon} />
            </Pressable>
            <Pressable style={styles.avatar} onPress={() => navigation.navigate('Settings', {})}>
              {avatar ? <Avatar.Image size={24} source={{ uri: avatar }} /> : <MaterialIcons name="account-circle" size={24} color="#fff" />}
            </Pressable>
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f37022',
    zIndex: 40,
    elevation: 40,
    height: 52,
    display: 'flex',
    flexDirection: 'row',
    paddingLeft: 15,
    paddingRight: 15,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: {
    color: '#fff',
  },
  menu: {
    padding: 5,
  },
  actions: {
    flexDirection: 'row',
  },
  currency: {
    marginRight: 10,
  },
  notifications: {
    paddingTop: 5,
    paddingRight: 10,
    paddingBottom: 5,
    paddingLeft: 5,
  },
  avatar: {
    marginLeft: 2,
    padding: 5,
  },
  badge: {
    backgroundColor: '#1976d2',
    color: '#ffffff',
    position: 'absolute',
    top: -2,
    right: 2,
    zIndex: 2,
  },
  badgeIcon: {
    zIndex: 1,
  },
  languageMenu: {
    marginTop: 45,
    borderRadius: 7,
  },
  languageItem: {
    height: 44,
  },
  selectedLanguageItem: {
    height: 44,
    backgroundColor: '#feeee4',
  },
  languageText: {
    color: 'rgba(0, 0, 0, 0.87)',
  },
  selectedLanguageText: {
    color: '#f37022',
  },
})

export default Header
