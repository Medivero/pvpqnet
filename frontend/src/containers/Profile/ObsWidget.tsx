import { getProfile } from "@/services/stats.service";
import { IPlayer } from "@/types";
import { Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { baseUrl } from "@/config";
import { groupBy } from "lodash";
import { DPS_SPECS, HEAL_SPECS } from "@/constants/filterSchema";

function getSearchParamOrDefault(
  searchParams: URLSearchParams,
  key: string,
  defaultValue: string
) {
  return searchParams.get(key) ?? defaultValue;
}

function getStyle(searchParams: URLSearchParams) {
  return getSearchParamOrDefault(searchParams, "style", "simple-text");
}

function getLayout(searchParams: URLSearchParams) {
  return getSearchParamOrDefault(searchParams, "layout", "vertical");
}

function getRole(searchParams: URLSearchParams) {
  return getSearchParamOrDefault(searchParams, "role", "all");
}

export const ObsWidget = () => {
  let { region, realm, name } = useParams();
  const [searchParams, _] = useSearchParams();
  const [player, setPlayer] = useState<IPlayer | null>(null);
  const [fullCharList, setFullCharList] = useState<IPlayer[] | null>(null);
  const style = getStyle(searchParams);
  const layout = getLayout(searchParams);
  const role = getRole(searchParams);
  useEffect(() => {
    document.title = `OBS Widget - ${name}-${realm} on ${region?.toUpperCase()}`;
    loadPlayerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, realm, name]);

  async function loadPlayerData() {
    const profile = await getProfile(region, realm, name);
    const { player: data } = profile;
    setPlayer(data);
    const charList = data?.alts;
    charList?.push(data);
    setFullCharList(charList);
  }
  const specAndBracket = fullCharList?.flatMap((char) => {
    return char.brackets
      .filter((bracket) => {
        return bracket.bracket_type.startsWith("SHUFFLE");
      })
      .map((bracket) => {
        return {
          full_spec: bracket.bracket_type.split("-")[1] + " " + char.class,
          is_rank_one_range: bracket.is_rank_one_range,
          bracket: bracket,
          rating: bracket.rating,
          rank: bracket.rank,
        };
      });
  });
  const grouped = groupBy(specAndBracket, "full_spec");
  const specAndMaxShuffle = Object.keys(grouped)
    .map((key) => {
      return grouped[key].sort((a, b) => {
        return b.rating - a.rating;
      })[0];
    })
    .sort((a, b) => {
      return b.rating - a.rating;
    }).filter((spec )=> {
      if (role === "healer") {
        return HEAL_SPECS.includes(spec.full_spec);
      } else if (role === "dps") {
        return DPS_SPECS.includes(spec.full_spec);
      } else {
        return true;
      }
    });
  console.log("final", specAndMaxShuffle);
  let flex;
  if (layout === "horizontal") {
    flex = "flex-row";
  } else if (layout === "vertical") {
    flex = "flex-col";
  } else {
    flex = "flex-col";
  }
  let contentList;
  if (style === "simple-text") {
    contentList = specAndMaxShuffle?.map((alt) => {
      return (
        <Typography variant="h6">
          {alt.full_spec} - #{alt.rank}
        </Typography>
      );
    });
  } else {
    contentList = [];
  }

  return (
    <div>
      <Typography variant="body1">
        data from PVPQ.NET
      </Typography>
      <br/>
      <div className={`flex ${flex} gap-1`}>{contentList}</div>
    </div>
  );
};
