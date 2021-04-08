<template>
  <div id="app">
    <el-container
      style="width: 60vw; position: relative; left: 50%; right: 50%; margin-left: -30vw; margin-right: -30vw"
    >
      <el-main>
        <el-upload
          class="upload-demo"
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
            将CSV文件拖到此处，或<em>点击上传</em>
          </div>
          <div class="el-upload__tip" slot="tip">坐标系转换:</div>
          <el-checkbox-group
            class="el-upload__tip"
            slot="tip"
            v-model="transformMode"
            @change="handleTransformModeChange"
            size="mini"
          >
            <el-checkbox label="WGS84 to GCJ02" border
              >WGS84 to GCJ02 (足迹)</el-checkbox
            >
            <el-checkbox label="GCJ02 to WGS84" border></el-checkbox>
          </el-checkbox-group>
          <div class="el-upload__tip" slot="tip">
            输出文件名:
            <el-input
              size="mini"
              v-model="outputFilename"
              placeholder="默认为: 时间.gpx"
              @input="handleOutputFilenameChange"
            ></el-input>
          </div>
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

function transformCoord(longitude, latitude) {
  if (!window.transformMode || window.transformMode.length == 0) {
    return [longitude, latitude];
  } else if (window.transformMode[0] == "WGS84 to GCJ02") {
    let result = gcoord.transform(
      [longitude, latitude],
      gcoord.WGS84,
      gcoord.GCJ02
    );
    return result;
  } else if (window.transformMode[0] == "GCJ02 to WGS84") {
    let result = gcoord.transform(
      [longitude, latitude],
      gcoord.GCJ02,
      gcoord.WGS84
    );
    return result;
  }
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
  var outputFilename = window.outputFilename
  if (!outputFilename || outputFilename.length == 0) {
    return Date.now() + ".gpx"
  } else {
    if (!outputFilename.match(/.*\.gpx$/i)) {
      return outputFilename + ".gpx"
    } else {
      return outputFilename
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
    if (callback.alert) callback.alert("只能上传CSV文件");
    if (callback.onError) callback.onError();
    return;
  }
  let fReader = new FileReader();
  fReader.readAsDataURL(file);
  fReader.onload = (evt) => {
    csv2gpx(atob(evt.target.result.split(";base64,")[1]), callback);
  };
}

window.transformMode = ["WGS84 to GCJ02"];
window.outputFilename = "";

export default {
  name: "App",
  data() {
    return {
      fileList: [],
      transformMode: window.transformMode,
      outputFilename: window.outputFilename,
    };
  },
  methods: {
    handleTransformModeChange(val) {
      if (val.length == 2) {
        this.transformMode.shift();
      }
      window.transformMode = this.transformMode;
    },
    // eslint-disable-next-line no-unused-vars
    handleOutputFilenameChange(val) {
      window.outputFilename = this.outputFilename;
    },
    httpRequest(param) {
      processCsvFile(param.file, {
        alert: this.$alert,
        onError() {
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
      processCsvFile(file.raw, {
        alert: this.$alert,
        onError() {},
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
