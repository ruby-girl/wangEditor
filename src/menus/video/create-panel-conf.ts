/**
 * @description video 菜单 panel tab 配置
 * @author tonghan
 */

import Editor from '../../editor/index'
import { PanelConf } from '../menu-constructors/Panel'
import { getRandom } from '../../utils/util'
import UploadVideo from './upload-video'
import $ from '../../utils/dom-core'

export default function (editor: Editor, video: string): PanelConf {
    // panel 中需要用到的id
    const upTriggerId = getRandom('up-trigger')
    const upFileId = getRandom('up-file')
    const uploadVideo = new UploadVideo(editor)
    /**
     * 插入链接
     * @param iframe html标签
     */
    const conf = {
        width: 300,
        height: 0,

        // panel 中可包含多个 tab
        tabs: [
            {
                // tab 的标题
                title: editor.i18next.t('menus.panelMenus.video.插入视频'),
                // 模板
                // tpl: `<div>
                //         <input
                //             id="${upTriggerId}"
                //             type="text"
                //             class="block"
                //             placeholder="${editor.i18next.t('如')}：<iframe src=... ></iframe>"/>
                //         </td>
                //         <div class="w-e-button-container">
                //             <button id="${upFileId}" class="right">
                //                 ${editor.i18next.t('插入')}
                //             </button>
                //         </div>
                //     </div>`,
                tpl: `<div class="w-e-up-img-container">
                <div id="${upTriggerId}" class="w-e-up-btn">
                    <i class="w-e-icon-upload2"></i>
                </div>
                <div style="display:none;">
                    <input id="${upFileId}" type="file" multiple="multiple" accept="mp4"/>
                </div>
            </div>`,
                // 事件绑定
                events: [
                    // 插入视频
                    {
                        selector: '#' + upTriggerId,
                        type: 'click',
                        fn: () => {
                            // 执行插入视频
                            const $file = $('#' + upFileId)
                            // let video = $file.val().trim()

                            const fileElem = $file.elems[0]
                            if (fileElem) {
                                fileElem.click()
                            } else {
                                // 返回 true 可关闭 panel
                                return true
                            }
                        },
                    },
                    // 选择图片完毕
                    {
                        selector: '#' + upFileId,
                        type: 'change',
                        fn: () => {
                            const $file = $('#' + upFileId)
                            const fileElem = $file.elems[0]
                            if (!fileElem) {
                                // 返回 true 可关闭 panel
                                return true
                            }

                            // 获取选中的 file 对象列表
                            const fileList = (fileElem as any).files
                            if (fileList.length) {
                                uploadVideo.uploadImg(fileList)
                            }

                            // 返回 true 可关闭 panel
                            return true
                        },
                    },
                ],
            }, // tab end
        ], // tabs end
    }

    return conf
}
