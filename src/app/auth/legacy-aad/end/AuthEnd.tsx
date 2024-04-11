"use client";

import { useEffect, useRef } from "react";
import * as teamsJs from "@microsoft/teams-js";

export default function AuthEnd() {
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    teamsJs.app
      .initialize()
      .then(() => {
        let hashParams = getHashParameters();

        if (hashParams["error"]) {
          // Authentication failed
          handleAuthError(hashParams["error"], hashParams);
        } else if (hashParams["code"]) {
          // Get the stored state parameter and compare with incoming state
          let expectedState = localStorage.getItem("state");
          if (expectedState !== hashParams["state"]) {
            // State does not match, report error
            handleAuthError("StateDoesNotMatch", hashParams);
          } else {
            teamsJs.authentication.notifySuccess();
          }
        } else {
          // Unexpected condition: hash does not contain error or access_token parameter
          handleAuthError("UnexpectedFailure", hashParams);
        }

        // Parse hash parameters into key-value pairs
        function getHashParameters() {
          let hashParams: Record<string, any> = {};
          location.hash
            .substr(1)
            .split("&")
            .forEach(function (item) {
              let s = item.split("="),
                k = s[0],
                v = s[1] && decodeURIComponent(s[1]);
              hashParams[k] = v;
            });
          return hashParams;
        }

        // Show error information
        function handleAuthError(errorType: any, errorMessage: any) {
          const err = JSON.stringify({
            error: errorType,
            message: JSON.stringify(errorMessage),
          });
          let para = document.createElement("p");
          let node = document.createTextNode(err);
          para.appendChild(node);

          let element = document.getElementById("divError");
          if (!element) {
            console.error("divError not found");
            return;
          }
          element.appendChild(para);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);
  return <div id="divError"></div>;
}
