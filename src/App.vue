<template>
  <div id="app" style="display: flex; justify-content: center;">
    <el-container style="maxWidth: 700px;">
      <el-main>
        <el-alert
          title="将足迹 APP 导出的 CSV 文件转换为 GPX 文件"
          type="info"
          :closable="false"
          style="margin-bottom: 20px;"
        >
        </el-alert>
        <el-alert
          title="使用说明"
          type="success"
          description="足迹输出的 CSV 的 timestamp 为 UTC 时区，坐标为 WGS-84 参考系。若将输出的 GPX 文件用于设置照片的 GPS 信息（即 Geoset），可以使用默认勾选的 WGS84 to GCJ02 模式。此模式下输出的坐标可以在群晖 DS Photo（内置高德地图）、Geosetter软件（Google中国地图）、Soso 地图、Aliyun 地图等软件中正确显示地理位置。"
          style="margin-bottom: 20px;"
          :closable="false"
        >
        </el-alert>
        <el-alert
          title="纯前端应用，不会上传 CSV 文件到服务器！"
          type="warning"
          style="margin-bottom: 20px;"
        >
        </el-alert>
        <el-upload
          action
          drag
          :on-preview="handlePreview"
          :on-remove="handleRemove"
          :before-remove="beforeRemove"
          :http-request="httpRequest"
          :auto-upload="true"
          multiple
          :file-list="fileList"
        >
          <i class="el-icon-upload" />
          <div class="el-upload__text">
            将CSV文件拖到此处，或<em>点击打开</em>
          </div>
          <div class="el-upload__tip" slot="tip">源坐标参考系:</div>
          <el-radio-group
            class="el-upload__tip"
            slot="tip"
            v-model="crsFrom"
            @change="handleCrsFromChange"
            size="mini"
          >
            <el-radio label="WGS84" border>WGS84（足迹）</el-radio>
            <el-radio label="GCJ02" border />
            <el-radio label="BD09" border />
          </el-radio-group>
          <div class="el-upload__tip" slot="tip">目标坐标参考系:</div>
          <el-radio-group
            class="el-upload__tip"
            slot="tip"
            v-model="crsTo"
            @change="handleCrsToChange"
            size="mini"
          >
            <el-radio label="WGS84" border>WGS84（国际）</el-radio>
            <el-radio label="GCJ02" border
              >GCJ02（DS Photo、高德、Google中国）</el-radio
            >
            <el-radio label="BD09" border>BD09（百度）</el-radio>
          </el-radio-group>
          <div class="el-upload__tip" slot="tip">输出文件名:</div>
          <el-input
            class="el-upload__tip"
            slot="tip"
            size="mini"
            v-model="outputFilename"
            placeholder="默认为: 时间.gpx"
            @input="handleOutputFilenameChange"
          ></el-input>
        </el-upload>
      </el-main>
    </el-container>
  </div>
</template>

<script>
import * as Papa from "papaparse";
import GPX from "gpx-parser-builder";
import { saveAs } from "file-saver";
import gcoord from "gcoord";
import dateformat from "dateformat";

function transformCoord(longitude, latitude) {
  if (window.crsTo == window.crsFrom) {
    return [longitude, latitude];
  }

  let crsMap = new Map();
  crsMap.set("WGS84", gcoord.WGS84);
  crsMap.set("GCJ02", gcoord.GCJ02);
  crsMap.set("BD09", gcoord.BD09);

  let crsFromCode = crsMap.get(window.crsFrom);
  let crsToCode = crsMap.get(window.crsTo);

  let result = gcoord.transform(
    [longitude, latitude],
    crsFromCode,
    crsToCode
  );
  return result;
}

function getGpxWaypoint(longitude, latitude, time) {
  var wpt = {
    $: {},
    lon: longitude,
    lat: latitude,
    time: time,
  };
  return wpt;
}

function getOutputFilename() {
  var outputFilename = window.outputFilename;
  if (!outputFilename || outputFilename.length == 0) {
    return dateformat(new Date(), "yyyy-dd-M--HH-mm-ss") + ".gpx";
  } else {
    if (!outputFilename.match(/.*\.gpx$/i)) {
      return outputFilename + ".gpx";
    } else {
      return outputFilename;
    }
  }
}

function csv2gpx(csv, callback) {
  var data = Papa.parse(csv);
  data = data.data;
  data.shift();
  let wpts = [];
  if (data[data.length - 1] == "") {
    //去除最后的空行
    data.pop();
  }
  data.forEach((row) => {
    var point = transformCoord(parseFloat(row[2]), parseFloat(row[3]));
    var wpt = getGpxWaypoint(point[0], point[1], parseInt(row[0]) * 1000);
    wpts.push(wpt);
  });
  var gpx = new GPX({ wpt: wpts });
  var blob = new Blob([gpx.toString()], {
    type: "application/gpx+xml;charset=utf-8",
  });
  saveAs(blob, getOutputFilename());
  if (callback.onSuccess) callback.onSuccess();
}

function processCsvFile(file, callback) {
  if (!file.name.match(/.*\.csv$/i)) {
    if (callback.onError) callback.onError("只能打开 CSV 文件!");
    return;
  }
  let fReader = new FileReader();
  fReader.readAsDataURL(file);
  fReader.onload = (evt) => {
    csv2gpx(atob(evt.target.result.split(";base64,")[1]), callback);
  };
}

window.outputFilename = "";
window.crsFrom = "WGS84";
window.crsTo = "GCJ02";

export default {
  name: "App",
  data() {
    return {
      fileList: [],
      outputFilename: window.outputFilename,
      crsFrom: window.crsFrom,
      crsTo: window.crsTo,
    };
  },
  methods: {
    handleCrsFromChange(val) {
      window.crsFrom = val;
    },
    handleCrsToChange(val) {
      window.crsTo = val;
    },
    // eslint-disable-next-line no-unused-vars
    handleOutputFilenameChange(val) {
      window.outputFilename = this.outputFilename;
    },
    httpRequest(param) {
      var _this = this;
      processCsvFile(param.file, {
        onError: (msg) => {
          if (msg && msg.length != 0) {
            _this.$message.error(msg);
          }
          param.onError();
        },
        onSuccess() {
          param.onSuccess();
        },
      });
    },
    // eslint-disable-next-line no-unused-vars
    handleRemove(file, fileList) {
      //console.log(file, fileList);
    },
    handlePreview(file) {
      var _this = this;
      processCsvFile(file.raw, {
        onError: (msg) => {
          if (msg && msg.length != 0) {
            _this.$message.error(msg);
          }
        },
        onSuccess() {},
      });
    },
    // eslint-disable-next-line no-unused-vars
    beforeRemove(file, fileList) {
      //return this.$confirm(`确定移除 ${file.name}？`);
      return true;
    },
  },
};
</script>

<style>
.el-main {
  background-color: #e9eef3;
  color: #333;
}
</style>
