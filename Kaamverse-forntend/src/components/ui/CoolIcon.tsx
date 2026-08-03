import { Icon, type IconProps } from '@iconify/react'
import addIcon from '@iconify-icons/ci/add-plus'
import analyticsIcon from '@iconify-icons/ci/bar-chart'
import arrowLeftIcon from '@iconify-icons/ci/arrow-left-md'
import arrowRightIcon from '@iconify-icons/ci/arrow-right-md'
import attachmentIcon from '@iconify-icons/ci/paperclip-attechment-horizontal'
import bellIcon from '@iconify-icons/ci/bell-notification'
import bookmarkIcon from '@iconify-icons/ci/bookmark'
import buildingIcon from '@iconify-icons/ci/building-03'
import calendarIcon from '@iconify-icons/ci/calendar-days'
import cameraIcon from '@iconify-icons/ci/camera'
import chatIcon from '@iconify-icons/ci/chat-conversation'
import checkIcon from '@iconify-icons/ci/check-big'
import clockIcon from '@iconify-icons/ci/clock'
import closeIcon from '@iconify-icons/ci/close-md'
import dashboardIcon from '@iconify-icons/ci/dashboard'
import devicesIcon from '@iconify-icons/ci/devices'
import documentIcon from '@iconify-icons/ci/file-document'
import downloadIcon from '@iconify-icons/ci/file-download'
import editIcon from '@iconify-icons/ci/edit-pencil-02'
import errorIcon from '@iconify-icons/ci/error-outline'
import fileIcon from '@iconify-icons/ci/file-blank'
import filterIcon from '@iconify-icons/ci/filter-outline'
import flagIcon from '@iconify-icons/ci/flag-outline'
import folderIcon from '@iconify-icons/ci/folder-open'
import globeIcon from '@iconify-icons/ci/globe'
import gridIcon from '@iconify-icons/ci/grid-round'
import groupIcon from '@iconify-icons/ci/users-group'
import heartIcon from '@iconify-icons/ci/heart-02'
import helpIcon from '@iconify-icons/ci/help-circle-outline'
import historyIcon from '@iconify-icons/ci/arrows-reload-01'
import homeIcon from '@iconify-icons/ci/home-outline'
import idCardIcon from '@iconify-icons/ci/id-card'
import infoIcon from '@iconify-icons/ci/info-circle-outline'
import laptopIcon from '@iconify-icons/ci/laptop'
import lightbulbIcon from '@iconify-icons/ci/bulb'
import linkIcon from '@iconify-icons/ci/link-horizontal'
import listIcon from '@iconify-icons/ci/list-checklist'
import locationIcon from '@iconify-icons/ci/map-pin'
import lockIcon from '@iconify-icons/ci/lock'
import logoutIcon from '@iconify-icons/ci/log-out'
import mailIcon from '@iconify-icons/ci/mail'
import microphoneIcon from '@iconify-icons/ci/user-voice'
import mobileIcon from '@iconify-icons/ci/mobile'
import moonIcon from '@iconify-icons/ci/moon'
import moreIcon from '@iconify-icons/ci/more-vertical'
import phoneIcon from '@iconify-icons/ci/phone-outline'
import playIcon from '@iconify-icons/ci/play-circle-outline'
import saveIcon from '@iconify-icons/ci/save'
import searchIcon from '@iconify-icons/ci/search-magnifying-glass'
import sendIcon from '@iconify-icons/ci/paper-plane'
import settingsIcon from '@iconify-icons/ci/settings'
import shareIcon from '@iconify-icons/ci/share-ios-export'
import shieldIcon from '@iconify-icons/ci/shield-check'
import showIcon from '@iconify-icons/ci/show'
import starIcon from '@iconify-icons/ci/star'
import sunIcon from '@iconify-icons/ci/sun'
import trashIcon from '@iconify-icons/ci/trash-empty'
import uploadIcon from '@iconify-icons/ci/file-upload'
import userIcon from '@iconify-icons/ci/user-circle'
import usersIcon from '@iconify-icons/ci/users'
import warningIcon from '@iconify-icons/ci/shield-warning'

const coolicons = {
  add: addIcon,
  analytics: analyticsIcon,
  'arrow-left': arrowLeftIcon,
  'arrow-right': arrowRightIcon,
  attachment: attachmentIcon,
  bell: bellIcon,
  bookmark: bookmarkIcon,
  building: buildingIcon,
  calendar: calendarIcon,
  camera: cameraIcon,
  chat: chatIcon,
  check: checkIcon,
  clock: clockIcon,
  close: closeIcon,
  dashboard: dashboardIcon,
  devices: devicesIcon,
  document: documentIcon,
  download: downloadIcon,
  edit: editIcon,
  error: errorIcon,
  file: fileIcon,
  filter: filterIcon,
  flag: flagIcon,
  folder: folderIcon,
  globe: globeIcon,
  grid: gridIcon,
  group: groupIcon,
  heart: heartIcon,
  help: helpIcon,
  history: historyIcon,
  home: homeIcon,
  'id-card': idCardIcon,
  info: infoIcon,
  laptop: laptopIcon,
  lightbulb: lightbulbIcon,
  link: linkIcon,
  list: listIcon,
  location: locationIcon,
  lock: lockIcon,
  logout: logoutIcon,
  mail: mailIcon,
  microphone: microphoneIcon,
  mobile: mobileIcon,
  moon: moonIcon,
  more: moreIcon,
  phone: phoneIcon,
  play: playIcon,
  save: saveIcon,
  search: searchIcon,
  send: sendIcon,
  settings: settingsIcon,
  share: shareIcon,
  shield: shieldIcon,
  show: showIcon,
  star: starIcon,
  sun: sunIcon,
  trash: trashIcon,
  upload: uploadIcon,
  user: userIcon,
  users: usersIcon,
  warning: warningIcon,
} as const

export type CoolIconName = keyof typeof coolicons

interface CoolIconProps extends Omit<IconProps, 'icon'> {
  name: CoolIconName
  label?: string
}

export function CoolIcon({ name, className = 'h-5 w-5', label, ...props }: CoolIconProps) {
  return (
    <Icon
      icon={coolicons[name]}
      className={className}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      {...props}
    />
  )
}
