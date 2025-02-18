import React, { useEffect, useState } from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { MaterialIcons } from '@expo/vector-icons'
import { Platform, StyleSheet, Pressable } from 'react-native'
import { useNavigation, NavigationProp } from '@react-navigation/native'
import DrawerNavigator from './DrawerNavigator'
import SignInScreen from '../screens/SignInScreen'
import SignUpScreen from '../screens/SignUpScreen'
import i18n from '../lang/i18n'
import * as UserService from '@/services/UserService'

type TabStackParams = {
  Search: undefined
  SignInModal: undefined
}

type RootStackParams = {
  MainTabs: undefined
  SignIn: undefined
  SignUp: undefined
}

const Tab = createBottomTabNavigator<TabStackParams>()
const Stack = createNativeStackNavigator<RootStackParams>()

const TabNavigator = () => {
  const [key, setKey] = useState(0)

  useEffect(() => {
    const init = async () => {
      const userLanguage = await UserService.getLanguage()
      i18n.locale = userLanguage
    }
    init()

    // Listen to locale changes
    const localeChangedListener = i18n.onChange(() => {
      // Force re-render by updating key
      setKey((prev: number) => prev + 1)
    })

    return () => {
      // Clean up listener
      if (localeChangedListener) {
        localeChangedListener()
      }
    }
  }, [])

  const MainTabs = () => {
    const tabNavigation = useNavigation<NavigationProp<RootStackParams>>()
    
    return (
      <Tab.Navigator
        key={key}
        screenOptions={{
          tabBarActiveTintColor: '#f37022',
          tabBarInactiveTintColor: '#666',
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarItemStyle: styles.tabBarItem,
        }}
      >
        <Tab.Screen
          name="Search"
          component={DrawerNavigator}
          options={{
            tabBarLabel: i18n.t('SEARCH'),
            tabBarIcon: ({ color }) => (
              <MaterialIcons
                name="search"
                size={28}
                color={color}
                style={styles.icon}
              />
            ),
          }}
        />
        <Tab.Screen
          name="SignInModal"
          component={DrawerNavigator}
          options={{
            tabBarLabel: i18n.t('SIGN_IN'),
            tabBarIcon: ({ color }) => (
              <MaterialIcons
                name="login"
                size={28}
                color={color}
                style={styles.icon}
              />
            ),
            tabBarButton: (props) => (
              <Pressable
                {...props}
                onPress={() => tabNavigation.navigate('SignIn')}
              />
            ),
          }}
        />
      </Tab.Navigator>
    )
  }

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SignIn"
        component={SignInScreen}
        options={({ navigation }) => ({
          presentation: 'modal',
          headerShown: true,
          headerLeft: () => (
            <Pressable
              onPress={() => navigation.goBack()}
              style={{ marginLeft: 10 }}
            >
              <MaterialIcons name="close" size={24} color="#fff" />
            </Pressable>
          ),
          headerTitle: i18n.t('SIGN_IN'),
          headerTitleStyle: {
            color: '#fff',
          },
          headerStyle: {
            backgroundColor: '#f37022',
          },
          headerShadowVisible: false,
        })}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={({ navigation }) => ({
          presentation: 'modal',
          headerShown: true,
          headerLeft: () => (
            <Pressable
              onPress={() => navigation.goBack()}
              style={{ marginLeft: 10 }}
            >
              <MaterialIcons name="close" size={24} color="#fff" />
            </Pressable>
          ),
          headerTitle: i18n.t('SIGN_UP'),
          headerTitleStyle: {
            color: '#fff',
          },
          headerStyle: {
            backgroundColor: '#f37022',
          },
          headerShadowVisible: false,
        })}
      />
    </Stack.Navigator>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    height: Platform.OS === 'ios' ? 88 : 70,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  tabBarLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  tabBarItem: {
    paddingTop: 6,
  },
  icon: {
    marginBottom: 4,
  },
})

export default TabNavigator
